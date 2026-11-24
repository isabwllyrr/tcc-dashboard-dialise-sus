# Avaliação de aceitação do assistente

## Objetivo

Verificar se o assistente seleciona o trecho correto do dossiê, aplica recusas de segurança e produz uma resposta local coerente quando o provedor de linguagem está indisponível. A avaliação não mede conhecimento clínico nem substitui uma avaliação humana das respostas livres do Gemini.

## Conjunto fixo

A suíte `tests/assistant_acceptance.test.mjs` reúne 23 casos: 20 perguntas de conteúdo e 3 regras de interação. Ela cobre saudação, UFs por nome e sigla, município, produção, custos, causalidade, modelos, MAPE, MASE, previsão, pedido de pacientes, pergunta clínica individual e assunto externo.

Os valores esperados são lidos ou derivados do dossiê publicado. Entre os casos de referência estão:

- Paraíba em 2025: 337.464 procedimentos aprovados e 8.103 por 100 mil habitantes, por local de atendimento;
- projeção oficial: Holt-Winters log-aditivo, com MAPE nominal de 3,56% em 43 janelas;
- cenário de julho de 2026 a junho de 2027: R$ 5,16 bilhões, com faixa empírica acumulada de R$ 4,77 bilhões a R$ 5,55 bilhões;
- vantagem do Gradient Boosting no alvo real: 0,09 ponto percentual de MAPE, com hiperparâmetros ajustados no mesmo backtest e sem holdout final independente.

## Resultado de 24 de novembro de 2026

- casos de aceitação: 23 de 23 aprovados (100%);
- suíte automatizada completa: 54 de 54 testes aprovados (100%);
- respostas clínicas individuais recusadas antes de qualquer chamada ao provedor;
- rotas internas ausentes do texto enviado ao modelo e do texto da resposta;
- nomes internos de modelos convertidos em rótulos legíveis.

## Interpretação

O resultado demonstra cobertura automatizada das regras e dos casos definidos, não uma taxa geral de exatidão do modelo generativo. Para afirmar desempenho do Gemini, é necessário executar o mesmo questionário em produção, avaliar as respostas com critérios previamente definidos e registrar concordância humana.

## Texto sugerido para o artigo

Foi realizada uma avaliação de aceitação do assistente com 23 casos previamente definidos, abrangendo seleção territorial, interpretação de métricas, previsão, recusas de segurança, saudações e perguntas fora do escopo. Todos os casos automatizados foram aprovados, incluindo a recuperação da taxa da Paraíba em 2025 e a oferta de procedimentos aprovados como alternativa quando o número de pacientes foi solicitado. O resultado valida as regras determinísticas, a seleção do contexto e o fallback local, mas não constitui medida geral da exatidão das respostas livres do modelo generativo, que permanece dependente de avaliação humana complementar.
