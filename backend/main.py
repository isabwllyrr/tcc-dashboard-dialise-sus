import json
import os
import time
import urllib.error
import urllib.request
from collections import defaultdict, deque
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


APP_NAME = "Agente DialisaSUS"
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:8080,http://127.0.0.1:8080",
    ).split(",")
    if origin.strip()
]

MAX_QUESTION_CHARS = 500
RATE_LIMIT_WINDOW_SECONDS = 60
RATE_LIMIT_MAX_REQUESTS = 10
_request_log: dict[str, deque[float]] = defaultdict(deque)

CLINICAL_TERMS = {
    "sintoma",
    "sintomas",
    "diagnostico",
    "diagnóstico",
    "tratamento",
    "remedio",
    "remédio",
    "dor",
    "urina",
    "sangue",
    "creatinina",
    "tenho",
    "paciente",
    "consulta",
    "medico",
    "médico",
}


SYSTEM_PROMPT = """
Você é o Agente DialisaSUS, um assistente de apoio à gestão em saúde.
Responda apenas com base no contexto fornecido pelo dashboard sobre
procedimentos de diálise aprovados no SUS, com fonte SIA/SUS-DATASUS.

Regras obrigatórias:
- Não invente números, municípios, percentuais, modelos ou conclusões.
- Se o contexto não trouxer a informação necessária, diga isso claramente.
- Não faça diagnóstico clínico individual, triagem real, prescrição ou orientação
  terapêutica pessoal.
- Se a pergunta envolver sintomas, exames individuais ou risco pessoal, recuse
  educadamente e oriente procurar um profissional de saúde.
- Mantenha a resposta curta, objetiva e útil para gestão pública.
""".strip()


class AskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=MAX_QUESTION_CHARS)
    context: dict[str, Any] = Field(default_factory=dict)


class AskResponse(BaseModel):
    answer: str
    source: str


app = FastAPI(title=APP_NAME, version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
      return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _check_rate_limit(ip: str) -> None:
    now = time.time()
    entries = _request_log[ip]
    while entries and now - entries[0] > RATE_LIMIT_WINDOW_SECONDS:
        entries.popleft()
    if len(entries) >= RATE_LIMIT_MAX_REQUESTS:
        raise HTTPException(
            status_code=429,
            detail="Limite de perguntas atingido. Tente novamente em instantes.",
        )
    entries.append(now)


def _is_clinical_question(question: str) -> bool:
    normalized = question.lower()
    return any(term in normalized for term in CLINICAL_TERMS)


def _clinical_refusal() -> str:
    return (
        "Não posso avaliar sintomas, exames individuais ou risco clínico pessoal. "
        "O Agente DialisaSUS usa apenas dados públicos agregados do SIA/SUS para "
        "apoio à gestão. Para uma situação individual, procure um profissional de saúde."
    )


def _fallback_answer(question: str, context: dict[str, Any]) -> str:
    period = context.get("periodo") or context.get("period") or "período filtrado"
    model_context = context.get("modelo_preditivo") if isinstance(context.get("modelo_preditivo"), dict) else {}
    indicator_context = context.get("indicadores") if isinstance(context.get("indicadores"), dict) else {}
    model = (
        context.get("modelo")
        or context.get("model")
        or model_context.get("modelo")
        or "modelo preditivo configurado"
    )
    mape = context.get("mape") or context.get("MAPE") or model_context.get("mape")
    metric_hint = []

    for label, key in [
        ("valor aprovado", "valor_aprovado"),
        ("valor aprovado", "valor_aprovado_total"),
        ("quantidade aprovada", "qtd_aprovada"),
        ("quantidade aprovada", "quantidade_aprovada_total"),
        ("custo médio", "custo_medio"),
        ("variação", "variacao"),
        ("variação", "crescimento_valor_primeiro_ultimo_ano_completo"),
    ]:
        if key in context:
            metric_hint.append(f"{label}: {context[key]}")
        elif key in indicator_context:
            metric_hint.append(f"{label}: {indicator_context[key]}")

    if not context:
        return (
            "Ainda não recebi indicadores do dashboard para responder com segurança. "
            "Envie a pergunta junto com o contexto calculado na interface."
        )

    parts = [
        f"Com base no contexto enviado pelo dashboard para {period}, "
        "a leitura deve se limitar aos indicadores fornecidos.",
    ]
    if metric_hint:
        parts.append("Indicadores disponíveis: " + "; ".join(metric_hint) + ".")
    if model:
        model_text = f"O modelo informado é {model}"
        if mape:
            model_text += f", com MAPE de {mape}"
        parts.append(model_text + ".")
    parts.append(
        "Para uma resposta analítica completa, configure a chave OPENAI_API_KEY no backend."
    )
    return " ".join(parts)


def _call_openai(question: str, context: dict[str, Any]) -> str:
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    "Contexto do dashboard em JSON:\n"
                    f"{json.dumps(context, ensure_ascii=False, indent=2)}\n\n"
                    f"Pergunta: {question}"
                ),
            },
        ],
        "temperature": 0.2,
        "max_tokens": 450,
    }
    request = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise HTTPException(status_code=502, detail=f"Erro no provedor de IA: {detail}")
    except urllib.error.URLError as exc:
        raise HTTPException(status_code=502, detail=f"Falha ao chamar o provedor de IA: {exc}")

    data = json.loads(raw)
    return data["choices"][0]["message"]["content"].strip()


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "app": APP_NAME,
        "model": MODEL,
        "ai_enabled": bool(OPENAI_API_KEY),
        "allowed_origins": ALLOWED_ORIGINS,
    }


@app.post("/api/ask", response_model=AskResponse)
def ask(payload: AskRequest, request: Request) -> AskResponse:
    ip = _client_ip(request)
    _check_rate_limit(ip)

    question = payload.question.strip()
    if _is_clinical_question(question):
        return AskResponse(answer=_clinical_refusal(), source="safety_rule")

    if not OPENAI_API_KEY:
        return AskResponse(
            answer=_fallback_answer(question, payload.context),
            source="local_fallback",
        )

    return AskResponse(
        answer=_call_openai(question, payload.context),
        source="openai",
    )
