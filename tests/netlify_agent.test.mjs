import assert from "node:assert/strict";
import test from "node:test";
import handler, { buildServerContext, fallbackAnswer, isClinicalQuestion, serializeContext } from "../netlify/functions/agent.mjs";

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

test("fallback sempre cita a rota dona",()=>{const context=buildServerContext("Quantos procedimentos foram aprovados?");assert.match(fallbackAnswer(context),/\/evidencias\/contagem\//);});

test("POST de formulário devolve HTML utilizável sem JavaScript", async () => {
  const original=process.env.GEMINI_API_KEY;delete process.env.GEMINI_API_KEY;
  try {const response=await handler(new Request("http://localhost/api/agent",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({pergunta:"Qual a fonte da base?"})}));const html=await response.text();assert.match(response.headers.get("content-type"),/text\/html/);assert.match(html,/\/sobre-a-base\//);assert.match(html,/Resposta baseada no dossiê/);} finally {if(original!==undefined)process.env.GEMINI_API_KEY=original;}
});

test("prompt do Gemini contém dossiê do servidor e não contexto forjado", async () => {
  const original=process.env.GEMINI_API_KEY;const oldFetch=globalThis.fetch;process.env.GEMINI_API_KEY="chave-teste";
  globalThis.fetch=async (_url,options)=>{const requestBody=JSON.parse(options.body);const prompt=requestBody.contents[0].parts[0].text;assert.match(prompt,/G1\.achado\.variacao_real/);assert.doesNotMatch(prompt,/VALOR_FORJADO/);return Response.json({candidates:[{content:{parts:[{text:"Resposta sustentada em /evidencias/valor/."}]}}]});};
  try {const response=await handler(jsonRequest({question:"Explique o valor real.",context:{valor:"VALOR_FORJADO"}}));const body=await response.json();assert.equal(body.source,"gemini");assert.equal(body.route,"/evidencias/valor/");} finally {globalThis.fetch=oldFetch;if(original===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=original;}
});

test("erro do provedor usa fallback local sem expor detalhes internos", async () => {
  const original=process.env.GEMINI_API_KEY;const oldFetch=globalThis.fetch;process.env.GEMINI_API_KEY="chave-teste";globalThis.fetch=async()=>new Response("SEGREDO DO PROVEDOR",{status:503});
  try {const response=await handler(jsonRequest({question:"Explique o valor real."}));const body=await response.json();const text=JSON.stringify(body);assert.equal(response.status,200);assert.equal(body.source,"local_fallback");assert.match(body.warning,/Gemini ficou indisponível/);assert.match(body.answer,/\/evidencias\/valor\//);assert.doesNotMatch(text,/SEGREDO|503|provider_status|model/);} finally {globalThis.fetch=oldFetch;if(original===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=original;}
});

test("filtros territoriais são enums validados", async () => {const response=await handler(jsonRequest({question:"Mostre a taxa por UF",uf:"SÃO PAULO",ano:"2026"}));assert.equal(response.status,422);});
test("serialização limita o contexto já selecionado",()=>assert.throws(()=>serializeContext({data:"x".repeat(30_001)}),RangeError));
