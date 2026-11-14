# Pré-diagnóstico de causa por IA (SCP-44/45/46)

Com a OS já aberta, o admin ou o técnico atribuído pede à IA (Gemini) um
**pré-diagnóstico**: hipóteses de causa com evidência, o que verificar primeiro,
peças prováveis e cuidados de segurança. A IA cruza a OS com o histórico do
equipamento. É uma **sugestão anexada à OS**, nunca uma etapa do fluxo: não muda
status, descrição nem prioridade, e não depende da aprovação da OS.

```
POST  /api/ordens-servico/{id}/diagnostico/             →  gera o pré-diagnóstico (admin ou técnico atribuído)
PATCH /api/ordens-servico/{id}/diagnostico/descartar/   →  descarta, com motivo (admin)
PATCH /api/ordens-servico/{id}/concluir/                →  aceita causa_confirmada / causa_real (opcionais)
GET   /api/ordens-servico/diagnostico/indicadores/?dias= →  acerto da IA (padrão 90 dias)
```

A OS expõe o campo `diagnostico_causa` (null enquanto ninguém gerou) na
listagem e no detalhe.

| Arquivo | O que tem |
|---|---|
| `backend/ordens_servico/diagnostico_ia.py` | Contexto do equipamento, prompt, schema, validação, descarte, causa confirmada e indicadores |
| `backend/ordens_servico/triagem_ia.py` | `consultar_gemini()`: chamada ao Gemini compartilhada com a triagem (retry, saída estruturada, erros) |
| `backend/ordens_servico/models.py` | `DiagnosticoCausa` (1:1 com a OS, tabela `diagnosticos_causa`) |
| `backend/ordens_servico/migrations/0006_diagnosticocausa.py` | Só cria a tabela nova |
| `backend/ordens_servico/serializers.py` / `views.py` | `DiagnosticoCausaSerializer` (somente leitura) e as ações da OS |
| `backend/ordens_servico/services.py` | Conclusão com a causa confirmada |
| `backend/ordens_servico/test_diagnostico_ia.py` | 41 testes (Gemini sempre mockado) |
| `frontend/app/components/dashboard/DiagnosticoCausa.js` | Bloco do detalhe da OS, botão de gerar, descarte, campo da conclusão e faixa de indicadores |
| `frontend/app/components/dashboard/pages/TicketsPage.js` | Liga tudo em Chamados |
| `frontend/lib/ordensServico.js` | `gerarDiagnosticoCausa`, `descartarDiagnosticoCausa`, `indicadoresDiagnosticoCausa` |

### No front-end (Chamados)

- **OS sem pré-diagnóstico**: para o admin e o técnico atribuído, com a OS aberta
  ou em andamento, aparece o quadro **Gerar pré-diagnóstico**, com o aviso de
  que os dados vão para o Gemini.
- **Com pré-diagnóstico** (bloco amarelo "Diagnóstico de causa (IA)"): causa
  provável com a evidência, resumo, outras hipóteses com a confiança, o que
  verificar e em que ordem, peças prováveis, cuidados de segurança, em que
  dados se baseou (IoT marcado como simulado) e o aviso de que é só uma
  sugestão. Confiança abaixo de 60% mostra um alerta.
- **Descartar** (admin): pede o motivo; o bloco fica cinza, com a causa riscada
  e "Descartado por ... em ...: motivo". Na lista, o selo vira "Diagnóstico
  descartado".
- **Concluir** (técnico): campo opcional **Causa encontrada** com as hipóteses e
  "Outra causa" (pede a descrição). Depois, o bloco mostra a causa confirmada
  em verde.
- **Faixa do admin** acima da lista: pré-diagnósticos gerados e descartados em
  90 dias e o acerto da IA (hipótese principal e entre as hipóteses).

---

## Como funciona

### Gerar

1. **Regras antes de gastar cota** (400): a OS tem que estar aberta ou em
   andamento, ter equipamento e ainda não ter pré-diagnóstico. Outros perfis
   recebem 403; OS que o usuário não enxerga, 404.
2. **Contexto** enviado ao Gemini em JSON, dentro de `<dados-{marcador}>` com um
   marcador aleatório por chamada (o mesmo esquema da triagem contra prompt
   injection). Textos saneados e cortados:
   - OS atual: título, descrição, relato original (quando veio da triagem),
     prioridade, tipo, origem e data de abertura;
   - equipamento: TAG, nome, tipo, fabricante, modelo, instalação e se tem IoT;
   - as 5 últimas OS concluídas do equipamento, com o relatório do técnico e a
     causa confirmada no pré-diagnóstico delas, se houver;
   - anomalias IoT dos últimos 7 dias, com `iot_simulado` (os dados de IoT deste
     ambiente são aleatórios; o prompt manda tratá-los como evidência fraca);
   - planos de manutenção do equipamento, com a próxima execução e se está
     atrasado.
3. **Resposta** no schema: 1 a 3 hipóteses (`causa`, `evidencia`, `confianca`),
   até 5 verificações, peças e cuidados, `tipo_problema`, `resumo` e
   `confianca`. O backend confere tipos e enums, saneia, corta e **reordena as
   hipóteses pela confiança**. Fora do schema conta como resposta inválida e
   entra no retry.
4. **Gravação**: `causa_provavel`, `descricao` (resumo) e `recomendacao`
   (primeira verificação) resumem a hipótese principal no formato que a tela do
   SCP-46 já consumia. Dois cliques ao mesmo tempo: a restrição 1:1 barra o
   segundo, que recebe 400.

### Descartar

Só o admin, com a OS aberta ou em andamento e motivo de 5 a 500 caracteres. O
pré-diagnóstico continua visível (e a causa ainda pode ser confirmada na
conclusão). Não há como gerar outro para a mesma OS.

### Causa confirmada (na conclusão)

`causa_confirmada` é `hipotese_1`, `hipotese_2`, `hipotese_3` ou `outra` (com
`causa_real` obrigatório). É conferida **antes** de concluir: valor inválido,
hipótese que não existe ou OS sem pré-diagnóstico respondem 400 e a OS não é
concluída. Omitir o campo continua funcionando como antes.

### Indicadores

Entre os pré-diagnósticos gerados na janela, nas OS que o usuário enxerga:

| Campo | Conta |
|---|---|
| `gerados`, `descartados` | Pré-diagnósticos da janela e quantos o admin descartou |
| `avaliados` | Com causa informada pelo técnico na conclusão |
| `taxa_acerto_principal` | Hipótese 1 confirmada ÷ avaliados (null sem avaliados) |
| `taxa_acerto_entre_hipoteses` | Qualquer hipótese confirmada ÷ avaliados |
| `outra_causa`, `confianca_media` | Causa fora das hipóteses e a confiança média declarada pela IA |

`?dias=` de 1 a 365 (400 fora disso).

### Erros

| HTTP | Quando |
|---|---|
| 400 | Regra de negócio (status, sem equipamento, já existe, motivo, causa inválida) |
| 403 | Gerar sem ser admin ou técnico atribuído; descartar sem ser admin |
| 404 | OS fora da visibilidade do usuário |
| 429 | Throttle `diagnostico_ia` por usuário (só na geração) |
| 502 | `resposta_ia_invalida`: fora do schema em todas as tentativas |
| 503 | `ia_indisponivel` / `limite_ia_atingido`: sem chave, timeout, 5xx, 429 do Gemini |

As mensagens de falha da IA são próprias do pré-diagnóstico ("tente gerar
novamente"), e não as da triagem ("abra a OS manualmente").

### Logs

Uma linha `diagnostico_ia` por geração, com modelo, usuário, empresa, OS,
contagens do contexto, tentativas, resultado e duração. Nunca o texto da OS.

## Configuração

| Variável (`.env`) | Padrão | Uso |
|---|---|---|
| `DIAGNOSTICO_IA_THROTTLE_RATE` | `5/min` | Limite de gerações por usuário |
| `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_TIMEOUT_SECONDS`, `GEMINI_MAX_RETRIES` | — | Os mesmos da triagem ([triagem_ia.md](triagem_ia.md)) |

Dados de demonstração (gravados direto, sem chamar o Gemini):

```bash
python manage.py seed_mock_data --with-os --with-planos
```

A OS "DEMO - Anomalia IoT de temperatura" ganha um pré-diagnóstico ativo, a
"DEMO - Falha na esteira" fica sem (para gerar na tela) e as 4 corretivas
concluídas ganham pré-diagnósticos com causa confirmada: acerto de 50% na
hipótese principal e 75% entre as hipóteses, com 1 descartado.

## Limitações conhecidas

- **IoT simulado**: as leituras são aleatórias; o prompt e a tela avisam, mas
  hipóteses apoiadas em IoT não valem como evidência real.
- **Um pré-diagnóstico por OS**: sem regenerar (nem depois de descartar), para
  não gastar cota e não perder o histórico do que a IA sugeriu.
- **Só sob demanda**: nada é gerado automaticamente na abertura da OS.
- **Privacidade na camada gratuita**: vale o mesmo aviso da triagem; os dados da
  OS e do equipamento vão para o Google.
- **A taxa de acerto depende do técnico** informar a causa na conclusão (campo
  opcional).

## Melhorias futuras

- Gerar automaticamente via Celery em OS de IoT ou de prioridade alta.
- Usar as causas confirmadas como exemplos (few-shot) por tipo de equipamento.
- Permitir regenerar guardando a versão anterior.
- Indicador de acerto por tipo de equipamento e por tipo de problema.
