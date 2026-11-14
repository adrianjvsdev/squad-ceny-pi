# Manutenções preventivas (aba Preventivas)

O admin agenda manutenções preventivas recorrentes por equipamento. Na data
(ou alguns dias antes), o sistema gera a OS, que segue o fluxo de sempre
(aprovação do admin → técnico inicia → técnico conclui). A aba **Preventivas**
mostra o que vence, o que atrasou e se o plano está sendo cumprido.

```
GET    /api/planos-manutencao/                       →  planos (com situação calculada)
POST   /api/planos-manutencao/                       →  agenda um plano (admin)
PATCH  /api/planos-manutencao/{id}/                  →  edita (admin)
DELETE /api/planos-manutencao/{id}/                  →  exclui (admin)
PATCH  /api/planos-manutencao/{id}/pausar/           →  para de gerar OS (admin)
PATCH  /api/planos-manutencao/{id}/retomar/          →  volta a gerar, sem recuperar o período pausado (admin)
PATCH  /api/planos-manutencao/{id}/executar-agora/   →  gera a OS da próxima ocorrência já (admin)
PATCH  /api/planos-manutencao/{id}/pular-proxima/    →  registra a próxima como pulada (admin)
GET    /api/planos-manutencao/{id}/execucoes/        →  histórico de ocorrências do plano
GET    /api/planos-manutencao/agenda/?inicio=&fim=   →  ocorrências registradas + projetadas
GET    /api/planos-manutencao/indicadores/?dias=     →  indicadores da aba
```

Filtros opcionais na listagem, na agenda e nos indicadores: `?id_equipamento=`,
`?id_setor=`, `?tipo=`, `?ativo=true|false` e `?tecnico=me` (planos em que o
usuário é o técnico sugerido). Leitura para todos os perfis, dentro da
visibilidade de sempre (admin vê a empresa; os demais, os seus setores);
escrita e ações só para admin (403 para os demais, 404 para outra empresa).

| Arquivo | O que tem |
|---|---|
| `backend/manutencao/models.py` | Campos de agendamento no `PlanoManutencao`, `ExecucaoPlano` (tabela `execucoes_plano`) e `com_situacao()` |
| `backend/manutencao/migrations/0004_agendamento_e_execucoes.py` | Só adiciona campos e a tabela nova |
| `backend/manutencao/services.py` | Calendário (`datas_entre`, `proximas_datas`), geração das OS, ações (pausar, retomar, executar agora, pular) e aviso de vencimento |
| `backend/manutencao/indicadores.py` | Agenda e indicadores (somente leitura) |
| `backend/manutencao/serializers.py` / `views.py` | Validações, situação do plano, filtros, ações e endpoints de leitura |
| `backend/manutencao/tasks.py` / `config/celery.py` | Task de hora em hora (`crontab(minute=0)`) |
| `backend/manutencao/management/commands/gerar_preventivas.py` | Faz o mesmo que a task, sem Celery |
| `backend/notificacoes/services.py` | `notificar_os_sistema` e `notificar_plano_vencendo` |
| `backend/ordens_servico/services.py` / `serializers.py` | Próxima manutenção vinda do plano na conclusão; campos `plano_*` na OS |
| `backend/usuarios/management/commands/seed_mock_data.py` | `--with-planos`: 7 planos com 3 meses de histórico |
| `backend/manutencao/test_preventivas.py`, `test_api_preventivas.py` | Regras, agenda, indicadores e API |
| `frontend/app/components/dashboard/pages/PreventivasPage.js` | A aba |
| `frontend/app/components/dashboard/preventivas/` | Indicadores, agenda, planos, detalhe do plano, prazo e planos do equipamento |
| `frontend/app/components/dashboard/AgendarManutencaoModal.js` | Modal de agendar/editar (usado na aba e no Inventário) |
| `frontend/app/components/dashboard/ConfirmarAcaoModal.js` | Confirmação de ação (no lugar do `confirm()`) |
| `frontend/lib/planosManutencao.js`, `datas.js`, `preventivas.js`, `erros.js` | API, datas só-dia, rótulos e agrupamento da agenda, erros do DRF |

### No front-end

- **Aba Preventivas** (todos os perfis): 4 indicadores, carga por técnico
  (admin), visão **Agenda** (atrasadas no topo, depois por semana) e visão
  **Planos** (o que pede ação primeiro, com as ações do admin). O técnico pode
  filtrar "só as minhas".
- **Inventário**: coluna "Próx. Manut." com destaque Atrasada / Hoje / em N
  dias, botão **Agendar** por linha e a seção "Manutenções agendadas" no
  detalhe do equipamento.
- **Chamados**: na aprovação de uma OS de plano, o técnico sugerido já vem
  selecionado; na conclusão, a próxima manutenção aparece como informativo
  (definida pelo plano) em vez de campo obrigatório.

## Como funciona

### Calendário do plano

`proxima_execucao` é a data prevista da próxima ocorrência **ainda não
gerada**. As ocorrências seguem a série `primeira + k × periodicidade`,
ancorada no plano: se a geração atrasar, as datas seguintes não escorregam
(antes, a próxima era calculada como `hoje + periodicidade`).

### Geração das OS (task de hora em hora ou `gerar_preventivas`)

Para cada plano preventivo, ativo e de equipamento que não esteja inativo:

1. Calcula as ocorrências vencidas: data prevista − `dias_antecedencia` ≤ hoje.
2. Se houver mais de uma (worker parado), gera só a **mais recente** e
   registra as anteriores como `pulada / atrasada`.
3. Se ainda houver OS do plano em aberto (aberta ou em andamento), **não gera
   outra**: registra a ocorrência como `pulada / os_em_aberto`.
4. Senão, cria a OS (prioridade e instruções do plano, `solicitante=None`,
   `plano_origem`), registra `ExecucaoPlano` com status `gerada` e notifica
   os admins ativos da empresa ("OS #N aguardando aprovação").
5. Avança `proxima_execucao` para a ocorrência seguinte da série.

Tudo acontece numa transação por plano, com `select_for_update`. A
restrição única `(plano, equipamento, data_prevista)` em `ExecucaoPlano`
impede OS duplicada mesmo com duas execuções simultâneas. Um plano com erro
é registrado no log e não interrompe os demais.

Depois da geração, `avisar_planos_vencendo` manda `PLANO_VENCENDO` aos admins
e ao técnico sugerido dos planos que vencem em até `PREVENTIVA_AVISO_DIAS`
dias, **uma vez por ocorrência** (`aviso_enviado_para`).

### Ações do admin

| Ação | Efeito |
|---|---|
| Pausar | `ativo=False`: não gera OS nem aviso, sai da agenda |
| Retomar | `ativo=True`; se a próxima data já passou, pula para a primeira data da série a partir de hoje, **sem** gerar o período pausado |
| Executar agora | Gera a OS da próxima ocorrência (ou da vencida mais recente) e avança o calendário. Recusa (400) com OS do plano em aberto, plano pausado ou equipamento inativo |
| Pular a próxima | Registra a ocorrência como `pulada / manual` e avança o calendário |

### Conclusão da OS

Em OS com `plano_origem` de plano **ativo**, a próxima manutenção (da OS e do
equipamento) é a `proxima_execucao` do plano, e a data enviada pelo técnico é
ignorada. OS sem plano, ou de plano pausado, continuam exigindo a data. A API
da OS expõe `plano_origem`, `plano_proxima_execucao` (null sem plano ativo) e
`plano_tecnico_sugerido`.

### Situação do plano

| Situação | Regra (na ordem) |
|---|---|
| `pausado` | `ativo=False` |
| `equipamento_inativo` | Equipamento com status inativo |
| `atrasado` | `proxima_execucao` < hoje, ou OS do plano em aberto com data prevista < hoje |
| `os_em_aberto` | Há OS do plano em aberto, ainda no prazo |
| `vence_em_breve` | Próxima execução em até 7 dias |
| `em_dia` | O resto |

### Indicadores

| Indicador | Conta |
|---|---|
| Aderência | Ocorrências com prazo encerrado na janela (data prevista + `PREVENTIVA_TOLERANCIA_DIAS` < hoje) concluídas até esse prazo ÷ total dessas ocorrências. Puladas pelo admin não entram; puladas por atraso ou OS em aberto e OS canceladas contam como não cumpridas |
| Atrasadas | OS de plano em aberto com data prevista < hoje + ocorrências vencidas ainda não geradas |
| Próximos 7 dias | Ocorrências previstas ou com OS gerada entre hoje e hoje + 6 |
| Preventiva x corretiva | Preventivas ÷ (preventivas + corretivas) entre as OS abertas na janela, sem as canceladas |
| Carga por técnico | Soma de `duracao_estimada_horas` das ocorrências das próximas 4 semanas, por técnico sugerido |

## Validações (400, mensagem por campo)

- `proxima_execucao` não pode ir para o passado (um plano já atrasado continua editável se a data não mudar).
- `dias_antecedencia` menor que `periodicidade_dias`; `duracao_estimada_horas` > 0; `instrucoes` até 2000 caracteres.
- `tecnico_sugerido` tem que ser vínculo de técnico da mesma empresa.
- Equipamento inativo não recebe agendamento novo.
- O setor do plano continua tendo que ser o do equipamento (o front preenche sozinho).
- Agenda: `fim` ≥ `inicio` e janela de até 366 dias. Indicadores: `dias` de 1 a 365.

## Configuração

| Setting (`.env`) | Padrão | Uso |
|---|---|---|
| `PREVENTIVA_TOLERANCIA_DIAS` | 3 | Dias após a data prevista em que a conclusão ainda conta "no prazo" |
| `PREVENTIVA_AVISO_DIAS` | 3 | Antecedência do aviso de plano vencendo |

Sem Celery rodando, nenhuma OS nasce sozinha. Para desenvolvimento e
demonstração:

```bash
python manage.py seed_mock_data --with-os --with-planos   # 7 planos com histórico (recria os dos DEMO-EQ-*)
python manage.py gerar_preventivas                         # o que a task faria agora
```

O seed calcula as datas a partir do dia em que roda: aderência ~69%, 2
atrasadas, 1 plano pausado e carga para o "Tecnico Demo". `--with-planos`
apaga e recria os planos (e as OS desses planos) dos equipamentos `DEMO-EQ-*`.

## Limitações conhecidas

- Só recorrência por número de dias (sem "todo dia 5" ou "toda segunda").
- Cada plano vale para um único equipamento (um equipamento pode ter vários planos); não há conjuntos de equipamentos.
- OS geradas por IoT continuam sem notificar os admins (evita excesso de avisos a cada 5 minutos).
- A agenda da aba busca até 90 dias para trás; o indicador de atrasadas conta todas.
- Sem campo de horas reais trabalhadas nem custo preenchido na conclusão: a carga usa a duração estimada.

## Melhorias futuras

- Conjuntos de equipamentos e recorrência por calendário (mês/semana).
- Custo e horas reais na conclusão, para comparar o custo da preventiva com o da corretiva.
- Usar o histórico de `ExecucaoPlano` (cumprimento) como fator na previsão de risco.
- Checklist marcável pelo técnico na OS.
