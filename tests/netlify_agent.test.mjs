import assert from "node:assert/strict";
import test from "node:test";
import handler, { buildServerContext, cleanAnswerText, detectTerritoryEntities, fallbackAnswer, isClinicalQuestion, serializeContext } from "../netlify/functions/agent.mjs";

function jsonRequest(payload) { return new Request("http://localhost/api/agent",{method:"POST",headers:{"content-type":"application/json","accept":"application/json"},body:JSON.stringify(payload)}); }

test("health não expõe provedor, modelo nem modo", async () => {
  const response=await handler(new Request("http://localhost/api/agent"));const body=await response.json();
  assert.equal(response.status,200);assert.equal(body.status,"ok");assert.equal("model" in body,false);assert.equal("provider" in body,false);assert.equal("mode" in body,false);
});

test("pergunta clínica individual é recusada antes do provedor", async () => {
  const original=process.env.GEMINI_API_KEY;process.env.GEMINI_API_KEY="nao-deve-ser-usada";const oldFetch=globalThis.fetch;globalThis.fetch=async()=>{throw new Error("não deveria chamar")};
  try {const response=await handler(jsonRequest({question:"Eu tenho dor e alteração na urina, qual meu risco?"}));const body=await response.json();assert.equal(body.source,"safety_rule");assert.equal(body.route,"/sobre-a-base/");} finally {globalThis.fetch=oldFetch;if(original===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=original;}
});

test("pergunta gerencial não é classificada como clínica",()=>assert.equal(isClinicalQuestion("Qual foi o custo do tratamento de diálise?"),false));

test("contexto é montado do dossiê e ignora números enviados pelo cliente", async () => {
  const original=process.env.GEMINI_API_KEY;delete process.env.GEMINI_API_KEY;
  try {const response=await handler(jsonRequest({question:"Qual a variação real do valor?",context:{variacao:"999999%"}}));const body=await response.json();assert.equal(body.route,"/evidencias/valor/");assert.doesNotMatch(body.answer,/999999/);assert.match(body.answer,/11,3%/);} finally {if(original!==undefined)process.env.GEMINI_API_KEY=original;}
});

test("fallback não expõe a rota reservada à interface",()=>{const context=buildServerContext("Quantos procedimentos foram aprovados?");assert.doesNotMatch(fallbackAnswer(context),/\/evidencias\//);assert.doesNotMatch(serializeContext(context),/rota_dona|\/evidencias\//);});

test("POST de formulário devolve HTML utilizável sem JavaScript", async () => {
  const original=process.env.GEMINI_API_KEY;delete process.env.GEMINI_API_KEY;
  try {const response=await handler(new Request("http://localhost/api/agent",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({pergunta:"Qual a fonte da base?"})}));const html=await response.text();assert.match(response.headers.get("content-type"),/text\/html/);assert.match(html,/\/sobre-a-base\//);assert.match(html,/Resposta baseada no dossiê/);} finally {if(original!==undefined)process.env.GEMINI_API_KEY=original;}
});

test("prompt do Gemini contém dossiê do servidor e não contexto forjado", async () => {
  const original=process.env.GEMINI_API_KEY;const originalModel=process.env.GEMINI_MODEL;const oldFetch=globalThis.fetch;process.env.GEMINI_API_KEY="chave-teste";process.env.GEMINI_MODEL="gemini-2.5-flash-lite";
  globalThis.fetch=async (_url,options)=>{const requestBody=JSON.parse(options.body);const prompt=requestBody.contents[0].parts[0].text;const system=requestBody.systemInstruction.parts[0].text;assert.match(prompt,/G1\.achado\.variacao_real/);assert.doesNotMatch(prompt,/VALOR_FORJADO|rota_dona|\/evidencias\//);assert.match(system,/Nunca use precisão, acurácia ou mais preciso/);assert.match(system,/projeção publicada usa Holt-Winters log-aditivo/);assert.match(system,/não está disponível e ofereça a medida relacionada/);assert.match(system,/Não use Markdown.*caminhos de URL/s);assert.deepEqual(requestBody.generationConfig.thinkingConfig,{thinkingBudget:0});return Response.json({candidates:[{content:{parts:[{text:"Resposta sustentada em /evidencias/valor/."}]}}]});};
  try {const response=await handler(jsonRequest({question:"Explique o valor real.",context:{valor:"VALOR_FORJADO"}}));const body=await response.json();assert.equal(body.source,"gemini");assert.equal(body.route,"/evidencias/valor/");assert.doesNotMatch(body.answer,/\/evidencias\//);} finally {globalThis.fetch=oldFetch;if(original===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=original;if(originalModel===undefined)delete process.env.GEMINI_MODEL;else process.env.GEMINI_MODEL=originalModel;}
});

test("erro do provedor usa fallback local sem expor detalhes internos", async () => {
  const original=process.env.GEMINI_API_KEY;const oldFetch=globalThis.fetch;process.env.GEMINI_API_KEY="chave-teste";globalThis.fetch=async()=>new Response("SEGREDO DO PROVEDOR",{status:503});
  try {const response=await handler(jsonRequest({question:"Explique o valor real."}));const body=await response.json();const text=JSON.stringify(body);assert.equal(response.status,200);assert.equal(body.source,"local_fallback");assert.equal(body.providerIssue,"provider_unavailable");assert.match(body.warning,/Gemini ficou indisponível/);assert.doesNotMatch(body.answer,/\/evidencias\//);assert.doesNotMatch(text,/SEGREDO|503|provider_status|model/);} finally {globalThis.fetch=oldFetch;if(original===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=original;}
});

test("modelo alternativo responde quando o principal está indisponível", async () => {
  const original=process.env.GEMINI_API_KEY;const originalModel=process.env.GEMINI_MODEL;const oldFetch=globalThis.fetch;process.env.GEMINI_API_KEY="chave-teste";delete process.env.GEMINI_MODEL;let calls=0;
  globalThis.fetch=async()=>{calls+=1;if(calls===1)return new Response("indisponível",{status:503});return Response.json({candidates:[{content:{parts:[{text:"Resposta pelo modelo alternativo em /evidencias/valor/."}]}}]});};
  try {const response=await handler(jsonRequest({question:"Explique o valor real."}));const body=await response.json();assert.equal(body.source,"gemini");assert.equal(body.warning,undefined);assert.equal(calls,2);} finally {globalThis.fetch=oldFetch;if(original===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=original;if(originalModel===undefined)delete process.env.GEMINI_MODEL;else process.env.GEMINI_MODEL=originalModel;}
});

test("modelo alternativo não é consultado quando o principal responde", async () => {
  const original=process.env.GEMINI_API_KEY;const originalModel=process.env.GEMINI_MODEL;const oldFetch=globalThis.fetch;process.env.GEMINI_API_KEY="chave-teste";delete process.env.GEMINI_MODEL;let calls=0;
  globalThis.fetch=async()=>{calls+=1;return Response.json({candidates:[{content:{parts:[{text:"Resposta pelo modelo principal em /evidencias/valor/."}]}}]});};
  try {const response=await handler(jsonRequest({question:"Como os custos mudaram?"}));const payload=await response.json();assert.equal(response.status,200);assert.equal(payload.source,"gemini");assert.equal(calls,1);} finally {globalThis.fetch=oldFetch;if(original===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=original;if(originalModel===undefined)delete process.env.GEMINI_MODEL;else process.env.GEMINI_MODEL=originalModel;}
});

test("filtros territoriais são enums validados", async () => {const response=await handler(jsonRequest({question:"Mostre a taxa por UF",uf:"SÃO PAULO",ano:"2026"}));assert.equal(response.status,422);});
test("serialização limita o contexto já selecionado",()=>assert.throws(()=>serializeContext({data:"x".repeat(30_001)}),RangeError));

test("nomes, siglas e municípios selecionam o território citado",()=>{
  assert.equal(detectTerritoryEntities("taxa da Paraíba").ufs[0].sigla,"PB");
  assert.equal(detectTerritoryEntities("taxa de PB").ufs[0].sigla,"PB");
  const joao=detectTerritoryEntities("produção de João Pessoa em 2025");assert.equal(joao.municipios[0].cod_ibge,"2507507");assert.equal(joao.municipios[0].sigla,"PB");
});

test("contexto da Paraíba traz taxa, produção, valor real, variação e ano",()=>{
  const context=buildServerContext("qual a taxa da Paraíba em 2025?");const pb=context.dados.territorios[0];
  assert.equal(context.categoria,"territorio");assert.equal(pb.sigla,"PB");assert.equal(pb.ano,"2025");assert.equal(pb.procedimentos_aprovados,337464);assert.ok(Math.abs(pb.taxa_procedimentos_por_100_mil_habitantes-8103.412)<0.01);assert.ok(pb.valor_aprovado_real_reais_jun_2026>86_000_000);assert.equal(typeof pb.variacao_real_2015_2025_percentual,"number");
});

test("pedido de pacientes recebe recusa com alternativa territorial",()=>{
  const answer=fallbackAnswer(buildServerContext("quantos pacientes na Paraíba?"));assert.match(answer,/não conta pacientes únicos/i);assert.match(answer,/337\.464 procedimentos/);assert.match(answer,/8\.103 procedimentos por 100 mil/);assert.match(answer,/local de atendimento/);
});

test("contexto de modelos usa rótulos legíveis e registra cautela do Gradient Boosting",()=>{
  const context=buildServerContext("qual modelo é mais preciso?");const serialized=serializeContext(context);
  assert.match(serialized,/Holt-Winters log-aditivo/);assert.match(serialized,/Regressão Ridge/);assert.doesNotMatch(serialized,/holt_winters|sazonal_ingenuo/);assert.match(serialized,/0,09 ponto percentual|0\.086001/);assert.match(serialized,/mesmo backtest/);
  const answer=fallbackAnswer(context);assert.match(answer,/menor erro/);assert.match(answer,/não é usado na projeção/);assert.doesNotMatch(answer,/mais preciso|acurácia/);
});

test("previsão acumulada informa período, cenário e faixa sem chamar de orçamento",()=>{
  const answer=fallbackAnswer(buildServerContext("quanto será gasto em 2027?"));assert.match(answer,/2026-07 a 2027-06/);assert.match(answer,/R\$ 5,16 bilhões/);assert.match(answer,/R\$ 4,77 a R\$ 5,55 bilhões/);assert.match(answer,/não um orçamento autorizado/);
});

test("limpeza remove rotas, fonte vazia e resíduos de junção",()=>{
  const dirty="Valor acumul / ado automaticamente.i\nFonte da informação:i\n/evidencias/modelo/";const clean=cleanAnswerText(dirty);
  assert.equal(clean,"Valor acumulado automaticamente.");
});
