import assert from "node:assert/strict";
import test from "node:test";

import handler, {
  fallbackAnswer,
  isClinicalQuestion,
  serializeContext,
} from "../netlify/functions/agent.mjs";


test("health informa o modo do agente", async () => {
  const originalKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  const response = await handler(new Request("http://localhost/api/agent"));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.provider, "gemini");
  assert.equal(body.mode, "local_fallback");
  if (originalKey !== undefined) process.env.GEMINI_API_KEY = originalKey;
});

test("pergunta clínica individual é recusada", async () => {
  const response = await handler(new Request("http://localhost/api/agent", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      question: "Eu tenho dor e alteração na urina, qual meu risco?",
      context: {},
    }),
  }));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.source, "safety_rule");
});

test("pergunta gerencial não é classificada como clínica", () => {
  assert.equal(isClinicalQuestion("Qual foi o custo do tratamento de diálise?"), false);
});

test("fallback usa apenas o contexto recebido", () => {
  const answer = fallbackAnswer({
    periodo: "2015 a 2026",
    indicadores: { valor_aprovado_total: "R$ 40,03 bi" },
  });
  assert.match(answer, /R\$ 40,03 bi/);
});

test("contexto excessivo é bloqueado", () => {
  assert.throws(() => serializeContext({ data: "x".repeat(30_001) }), RangeError);
});

test("resposta do Gemini é extraída sem expor a chave", async () => {
  const originalKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = "chave-falsa-de-teste";
  globalThis.fetch = async (_url, options) => {
    assert.match(_url, /models\/gemini-3\.6-flash:generateContent$/);
    assert.equal(options.headers["x-goog-api-key"], "chave-falsa-de-teste");
    const requestBody = JSON.parse(options.body);
    assert.match(requestBody.systemInstruction.parts[0].text, /SIA\/SUS-DATASUS/);
    assert.match(requestBody.contents[0].parts[0].text, /Resuma o cenário nacional/);
    return Response.json({
      candidates: [{
        content: {
          parts: [{ text: "Resposta gerencial simulada." }],
        },
      }],
    });
  };

  try {
    const response = await handler(new Request("http://localhost/api/agent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        question: "Resuma o cenário nacional.",
        context: { periodo: "2015 a 2026" },
      }),
    }));
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.source, "gemini");
    assert.equal(body.answer, "Resposta gerencial simulada.");
    assert.equal(JSON.stringify(body).includes("chave-falsa"), false);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  }
});

test("modelo alternativo é usado quando o principal não está disponível", async () => {
  const originalKey = process.env.GEMINI_API_KEY;
  const originalModel = process.env.GEMINI_MODEL;
  const originalFetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = "chave-falsa-de-teste";
  process.env.GEMINI_MODEL = "gemini-2.5-flash-lite";
  const calledUrls = [];
  globalThis.fetch = async (url) => {
    calledUrls.push(url);
    if (calledUrls.length === 1) {
      return Response.json({ error: { status: "NOT_FOUND" } }, { status: 404 });
    }
    return Response.json({
      candidates: [{ content: { parts: [{ text: "Resposta pelo modelo alternativo." }] } }],
    });
  };

  try {
    const response = await handler(new Request("http://localhost/api/agent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: "Resuma os indicadores.", context: { periodo: "2026" } }),
    }));
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.match(calledUrls[0], /gemini-2\.5-flash-lite/);
    assert.match(calledUrls[1], /gemini-3\.6-flash:generateContent$/);
    assert.equal(body.model, "gemini-3.6-flash");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
    if (originalModel === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = originalModel;
  }
});
