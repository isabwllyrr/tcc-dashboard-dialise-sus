import assert from "node:assert/strict";
import test from "node:test";
import handler, { buildServerContext, fallbackAnswer, isClinicalQuestion } from "../netlify/functions/agent.mjs";

function request(question) {
  return new Request("http://localhost/api/agent", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question }),
  });
}

const localCases = [
  ["taxa da Paraíba em 2025", "territorio", /8\.103 procedimentos por 100 mil habitantes.*2025|2025.*8\.103 procedimentos por 100 mil habitantes/s],
  ["taxa de PB em 2025", "territorio", /Paraíba.*8\.103/s],
  ["produção de João Pessoa em 2025", "territorio", /Joao Pessoa \(PB\).*130\.540 procedimentos/s],
  ["por que o Piauí lidera?", "territorio", /polo regional.*não representam prevalência/s],
  ["quantos pacientes na Paraíba?", "territorio", /não conta pacientes únicos.*337\.464 procedimentos/s],
  ["qual modelo é mais preciso?", "modelo", /projeção oficial usa Holt-Winters log-aditivo.*menor erro/s],
  ["qual modelo é usado na previsão?", "modelo", /Gradient Boosting não é usado na projeção/s],
  ["o que é MASE?", "modelo", /erro absoluto médio.*não deve ser chamado de precisão ou acurácia/s],
  ["o que o MAPE informa?", "modelo", /Holt-Winters log-aditivo.*MAPE de 3,56%/s],
  ["quanto será gasto em 2027?", "modelo", /R\$ 5,16 bilhões.*R\$ 4,77 a R\$ 5,55 bilhões/s],
  ["qual a previsão acumulada?", "modelo", /projeção exploratória, não um orçamento autorizado/s],
  ["a pandemia aumentou a diálise?", "valor", /comparação é descritiva e não demonstra.*causou/s],
  ["como mudou o valor real?", "valor", /valor anual real variou \+11,3%/s],
  ["quantos procedimentos foram aprovados?", "contagem", /procedimentos aprovados.*não pessoas/s],
  ["quantas pessoas fizeram diálise?", "contagem", /não conta pacientes únicos.*procedimentos aprovados/s],
  ["qual a taxa de São Paulo em 2025?", "territorio", /São Paulo.*2025.*procedimentos por 100 mil/s],
  ["qual a produção de PI em 2025?", "territorio", /Piauí.*procedimentos aprovados em 2025/s],
  ["compare o mapa por estado", "territorio", /local de atendimento.*não mede prevalência/s],
  ["qual o custo nominal?", "valor", /2015.*2025.*valor anual real/s],
  ["esses procedimentos representam pacientes?", "contagem", /não conta pacientes únicos/s],
];

for (const [question, category, expected] of localCases) {
  test(`aceitação local: ${question}`, () => {
    const context = buildServerContext(question);
    assert.equal(context.categoria, category);
    assert.match(fallbackAnswer(context), expected);
  });
}

test("aceitação: saudação é curta e oferece três exemplos", async () => {
  const response = await handler(request("oi")); const body = await response.json();
  assert.equal(body.source, "local_rule"); assert.match(body.answer, /^Olá!/); assert.equal((body.answer.match(/;/g) || []).length, 2);
});

test("aceitação: pergunta clínica individual é recusada", () => {
  assert.equal(isClinicalQuestion("meu pai precisa de diálise?"), true);
});

test("aceitação: assunto externo é recusado e redirecionado", async () => {
  const response = await handler(request("qual a capital da França?")); const body = await response.json();
  assert.equal(body.source, "scope_rule"); assert.match(body.answer, /fora do escopo/); assert.match(body.answer, /custos.*taxa.*modelo/s);
});
