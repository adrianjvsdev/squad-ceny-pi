# Meta prompt — Agendamento de manutenções (Inventário) + Previsão de risco (Mapa de Risco)

> **Nota (nov/2026): a Feature 1 (agendamento, seções 6 e 8) foi substituída e NÃO deve ser executada.**
> O agendamento foi implementado como a aba **Preventivas** (branch `feat/aba-preventivas`), documentada em
> `docs/manutencao_preventiva.md`. Diferenças em relação a este prompt: página própria em vez de subaba do
> Inventário, sem conjuntos de equipamentos (o `id_equipamento` do plano continua obrigatório), sem
> agendamento pontual, e ações via `PATCH` (não `POST`).
>
> **A Feature 2 (previsão de risco, seção 7) continua válida.** O que ela pede da Feature 1 já existe:
> `ExecucaoPlano` (tabela `execucoes_plano`, com `id_plano`, `id_equipamento`, `data_prevista`, `id_os`,
> `status` gerada/pulada e `motivo`) dá o cumprimento das preventivas, e `manutencao/indicadores.py::
> concluida_no_prazo` diz se cada ocorrência foi feita no prazo. As seções 2 e 4 (contexto e armadilhas)
> estão parcialmente desatualizadas: a escrita de planos já é só admin, o `crontab` já roda de hora em hora,
> a OS gerada pelo sistema já notifica os admins e o N+1 do Inventário já foi corrigido. Confirme na Fase 0.

## 0. Resumo da missão

Você vai implementar duas funcionalidades no sistema de gestão de manutenção industrial **squad-ceny-pi** (Django + Next.js), neste repositório:

1. **Agendamento de manutenções no Inventário**: agendar manutenções preventivas, pontuais ou recorrentes, para um **equipamento** ou para um **conjunto de equipamentos** (conceito novo).
2. **Previsão de risco no Mapa de Risco**: cada equipamento aparece no mapa **como texto** (TAG + nome), com uma etiqueta acima dele mostrando a **probabilidade prevista de falha** num horizonte (ex.: "23% · 30 dias"), nível, tendência e confiança. O clique abre um painel com detalhes e os fatores que explicam a previsão. O número vem de um **modelo estatístico/ML no backend**. A IA generativa (Gemini, já integrada) entra no máximo para **explicar em texto** e nunca calcula o número.

Trabalhe em fases (seção 9). **A Fase 0 é só leitura e plano: não edite nenhum arquivo até o usuário aprovar o plano e responder às decisões da seção 10.**

---

## 1. Papel e postura

- Atue como engenheiro full stack sênior (Django/DRF + Next.js/React) com experiência em ML aplicado a manutenção (confiabilidade, análise de sobrevivência, modelos calibrados).
- Leia antes de editar. Siga as convenções do código existente (seção 5) e não refatore o que não faz parte da tarefa.
- Seja honesto sobre incerteza. O banco está quase vazio e o IoT é simulado, então nenhuma tela pode sugerir uma precisão que o modelo não tem.
- Relate os resultados com fidelidade: se um teste falhar, mostre a saída. Se algo não foi verificado, diga.
- Quando encontrar uma alternativa melhor do que a sugerida aqui, proponha com justificativa antes de seguir. As sugestões de modelagem deste prompt são um ponto de partida forte, não um dogma.

---

## 2. Contexto verificado do projeto

### Stack real (o `requirements.txt` e o `package.json` valem mais que o README, que está desatualizado)

**Backend** (`backend/`)
- Python 3.12, **Django 6.0.4**, DRF 3.17, SimpleJWT 5.5, django-cors-headers.
- **Celery 5.6 + django-celery-beat 2.9 + Redis** (Memurai no Windows). Broker fixo em `redis://localhost:6379/0`.
- **google-genai 2.28** (Gemini), já usado na triagem de OS por IA.
- SQLite por padrão (PostgreSQL opcional via `DB_ENGINE`).
- **Sem** numpy, pandas, scikit-learn, scipy ou django-filter instalados.
- DRF **sem paginação** (as listagens devolvem arrays), **sem `CACHES`** configurado (LocMem por processo), `DEFAULT_PERMISSION_CLASSES = IsAuthenticated`.

**Frontend** (`frontend/`)
- **Next.js 16.2 (App Router), React 19.2, React Compiler ligado** (`reactCompiler: true`), **JavaScript** (sem TypeScript), axios.
- **Nenhuma biblioteca de UI ou de gráficos.** Os estilos são inline, com tokens `C` e ícones `Icons` de `frontend/lib/constants.js`, e componentes de `frontend/app/components/ui/index.js`: `Ico`, `Badge`, `IoTBadge`, `Tooltip` (só hover), `Modal`, `Input`, `Select`, `Btn`. Hoje o `Btn` não repassa `type`, `title` nem `aria-*`.
- O dashboard é SPA-like: `DashboardShell.js` troca a página por estado (`inventory` → `InventoryPage`, `riskmap` → `RiskMapPage` em `OtherPages.js`). O perfil chega como prop `userType`/`perfil` (`admin` | `tecnico` | `operador`).

### Domínio e regras que já existem
- Multiempresa: `Empresa → Setor → Equipamento`. A visibilidade usa `QuerySet.visiveis_para(usuario)`: o **admin vê a empresa inteira** e os demais veem **só os setores em que têm `UsuarioSetor`**. A escrita valida "mesma empresa" com `empresas/validators.py::validar_mesma_empresa`.
- Perfis: `Usuario.Perfil` = admin/tecnico/operador. `UsuarioSetor.perfil_no_setor` = gestor/operador/visualizador/tecnico.
- **Fluxo de OS** (`ordens_servico/services.py::OrdemServicoService`): `aberta` → admin **aprova** (`em_andamento`, com técnico opcional; o equipamento vira `em_manutencao`) → o técnico atribuído **conclui** (`proxima_manutencao` é **obrigatória**; atualiza `Equipamento.ultima_manutencao/proxima_manutencao` e `PlanoManutencao.ultima_manutencao` do `plano_origem`, e libera o equipamento se não houver outra OS ativa). **Toda OS aberta exige aprovação do admin**, inclusive as geradas pelo sistema.
- Manutenção (`manutencao/`):
  - `PlanoManutencao` (tipo `preventiva`/`preditiva`, `periodicidade_dias`, `proxima_execucao`, FK obrigatória `id_equipamento`, `id_setor` que deve ser igual ao setor do equipamento, `ultima_manutencao`).
  - `services.criar_os_preventiva(plano)` cria a OS (`solicitante=None`, `plano_origem=plano`) e faz `proxima_execucao = hoje + periodicidade`.
  - `tasks.verificar_manutencoes_preventivas` gera OS para planos vencidos e ignora equipamentos inativos.
  - `AnomaliaIoT` (tipo, valor, valor_limite, severidade, `detectada_em`, `os_gerada`) e `tasks.processar_anomalias_iot`, que roda a cada 5 min.
  - `iot_Mock.py` sorteia leituras com `random.uniform`. **Só as anomalias são persistidas; as leituras não têm histórico.**
- Notificações (`notificacoes/services.py::NotificacaoService`) são centralizadas no service. **`Notificacao.Tipo.PLANO_VENCENDO` já existe e não é usado.** `notificar_abertura` depende de `solicitante`, então **hoje as OS geradas pelo sistema não notificam ninguém**.
- `LogAuditoria` é gravado por signals (`notificacoes/signals.py`) em `OrdemServico` e `PlanoManutencao`.
- **Referência de integração com IA**: `backend/ordens_servico/triagem_ia.py` + `docs/triagem_ia.md`. Esse arquivo já tem o padrão a copiar: saída estruturada (`response_json_schema`), dado do usuário envolto em marcador aleatório (`secrets.token_hex`), retry com backoff só para erros transitórios, validação estrita da resposta, logs sem dados sensíveis, `ScopedRateThrottle` com escopo próprio, settings `GEMINI_*`, e testes que **sempre** mockam o Gemini.
- Mapa de risco atual:
  - `frontend/lib/riskMap.js` tem funções puras: agrupa por setor, `calculateRisk` por regras de contagem de OS e status (low/medium/high) e `getZoneGeometry` (grade dentro de um `viewBox 680×480`).
  - `RiskMapPage`, em `frontend/app/components/dashboard/pages/OtherPages.js`, desenha só retângulos por setor em SVG. Os equipamentos aparecem apenas na lista lateral depois do clique, e a página faz 3 chamadas (`/api/setores/`, `/api/equipamentos/`, `/api/ordens-servico/`).
  - `SetorViewSet` devolve **todos** os setores da empresa para qualquer perfil, mas os equipamentos e as OS vêm filtrados por visibilidade.
- Inventário atual (`frontend/app/components/dashboard/pages/InventoryPage.js`): tabela de equipamentos, tooltip com IoT, modal de detalhe e modais (só admin) para cadastrar setor, tipo e equipamento. Não há nada de agendamento.

### Testes e dados
- Os testes usam Django `TestCase`, com utilitários em `backend/config/testutils.py` (`BaseTestCase`, `Cenario`, `criar_empresa/usuario/setor/equipamento`, `vincular`).
- **Baseline: 275 testes passando** (`cd backend && venv\Scripts\python.exe manage.py test`). Confirme na Fase 0.
- O `db.sqlite3` local está **praticamente vazio** (0 equipamentos, 0 OS, 0 anomalias) e tem **migrations pendentes** (rode `migrate`). O seed existente é `python manage.py seed_mock_data --with-os`.

---

## 3. Mapa de arquivos relevantes

| Área | Arquivos |
|---|---|
| Modelos | `backend/equipamentos/models.py`, `backend/manutencao/models.py`, `backend/ordens_servico/models.py`, `backend/empresas/models.py`, `backend/usuarios/models.py`, `backend/notificacoes/models.py` |
| Regras | `backend/manutencao/services.py`, `backend/manutencao/tasks.py`, `backend/ordens_servico/services.py`, `backend/ordens_servico/resolvers.py`, `backend/notificacoes/services.py`, `backend/notificacoes/signals.py` |
| API | `backend/manutencao/{views,serializers,urls}.py`, `backend/equipamentos/{views,serializers,urls}.py`, `backend/config/urls.py`, `backend/usuarios/permissions.py` (`IsAdmin`) |
| Agendador | `backend/config/celery.py` (beat_schedule), `backend/config/settings.py` |
| IA (padrão) | `backend/ordens_servico/triagem_ia.py`, `backend/ordens_servico/test_triagem_ia.py`, `docs/triagem_ia.md` |
| Testes | `backend/config/testutils.py`, `backend/manutencao/tests.py`, `backend/ordens_servico/tests.py` |
| Seed | `backend/usuarios/management/commands/seed_mock_data.py` |
| Front: Inventário | `frontend/app/components/dashboard/pages/InventoryPage.js`, `frontend/lib/equipamentos.js`, `frontend/lib/setores.js` |
| Front: Mapa | `frontend/app/components/dashboard/pages/OtherPages.js` (`RiskMapPage`), `frontend/lib/riskMap.js` |
| Front: base | `frontend/app/components/ui/index.js`, `frontend/lib/constants.js`, `frontend/lib/api.js`, `frontend/app/components/dashboard/DashboardShell.js`, `frontend/app/components/dashboard/pages/TicketsPage.js` (modal de concluir OS com `proxima_manutencao`) |

---

## 4. Armadilhas conhecidas (confirme cada uma antes de depender dela)

1. **`backend/requirements.txt` está em UTF-16 LE com BOM e CRLF.** Um `echo >>` ou uma escrita ingênua corrompe o arquivo. Se precisar adicionar dependências, preserve a codificação ou converta para UTF-8 num commit separado e explícito, avisando o usuário.
2. **`crontab(hour='*/1')` em `config/celery.py` roda a cada minuto**, porque o `minute` padrão é `'*'`. O comentário diz "a cada hora". Isso afeta o agendamento: não presuma execução horária. Proponha `crontab(minute=0)` (decisão 10.10).
3. **`criar_os_preventiva` faz `proxima_execucao = hoje + periodicidade`**, então o calendário escorrega se a task atrasar. Para agendamento, ancore no calendário do plano (seção 6.4).
4. **`PlanoManutencaoViewSet` permite que qualquer usuário autenticado crie, edite e exclua planos** dentro da própria visibilidade. Defina as permissões de escrita (decisão 10.1).
5. **`manutencao/tests.py::test_campos_da_resposta` compara o conjunto exato de campos do plano.** Adicionar campos quebra esse teste. Atualize-o de propósito e explique no relatório.
6. **Frontend**: `lib/equipamentos.js::getProximaManutencao` lê `response.results`, mas a API devolve array (sem paginação), e o backend ignora `?id_equipamento=` e `?ordering=`. O resultado é sempre `null`. Além disso, `InventoryPage.carregarEquipamentos` faz N+1 chamadas **sequenciais** (plano + IoT por equipamento). A feature nova não pode piorar isso: carregue os planos uma vez e indexe por equipamento, e use `Promise.all` para o IoT.
7. **`OrdemServico.data_abertura` e `AnomaliaIoT.detectada_em` são `auto_now_add`.** Para gerar histórico retroativo (dados sintéticos e testes de séries temporais), crie o registro e depois faça `QuerySet.update(data_abertura=...)`.
8. **Django 6**: em `CheckConstraint` use `condition=`, porque o argumento `check=` foi removido. Prefira `UniqueConstraint` a `unique_together` em código novo.
9. **`Equipamento.status` não tem histórico** (`LogAuditoria` só cobre OS e Plano). Não use o status como feature histórica de ML, porque isso vaza informação do futuro.
10. **`Equipamento` não tem data de criação.** Para calcular a exposição (dias em operação), use `data_entrada_operacao` → `data_instalacao` → primeira OS/anomalia → padrão com confiança baixa. Avalie adicionar `criado_em` (`auto_now_add`, `null=True` para as linhas antigas).
11. **`TriagemIA` não persiste `risco_seguranca` nem `equipamento_parado`.** Só adicione esses campos (migration aditiva) se forem usados como feature.
12. **O IoT é ruído uniforme.** Um modelo treinado nele não aprende nada real, e a UI precisa indicar "dados IoT simulados".
13. `AnomaliaIoT` usa a PK padrão `id` e o campo `equipamento` (não `id_equipamento`). Respeite os nomes que cada model já tem.
14. `frontend/lib/api.js` fixa `BASE_URL = "http://localhost:8000"` e ignora `NEXT_PUBLIC_API_URL`. Não mexa nisso sem pedir.
15. Com o React Compiler ligado, não mute estado nem props. Mantenha os componentes puros.
16. `random.gammavariate(alpha, beta)` da stdlib usa **escala** (média = alpha·beta). Para uma taxa β, passe `1/β`.

---

## 5. Convenções obrigatórias

**Backend**
- Nomes, docstrings e mensagens em **português do Brasil**. Docstrings e comentários seguem o estilo do código (curtos, muitas vezes sem acento). Mensagens para o usuário levam acento.
- Models:
  - PK explícita `id_<entidade>` (`AutoField`), FKs chamadas `id_<entidade>` com `db_column`, e `class Meta: db_table = "<plural_snake>"`.
  - Enums com `TextChoices`.
  - Escopo por `QuerySet.visiveis_para(usuario)` com `as_manager()`.
- Serializers:
  - Validam "mesma empresa" com `validar_mesma_empresa`.
  - Campos desnormalizados são read-only (`equipamento_tag`, `setor_nome`...).
  - Validações cruzadas ficam em `validate()`.
- Regra de negócio fica em **services** e as views ficam finas. `ValueError` do service vira 400 `{"detail": ...}`, e falta de permissão vira 403 com a mensagem numa constante (`MSG_...`), como em `ordens_servico/views.py`.
- **Migrations apenas aditivas.** Não edite migrations antigas. `python manage.py makemigrations --check` tem que ficar limpo no fim.
- Notificações sempre via `NotificacaoService`, nunca `Notificacao.objects.create` espalhado.
- Logs com `logging.getLogger(__name__)` em formato `chave=valor`, sem dados sensíveis.
- Tests: toda regra nova precisa de teste. Isso inclui:
  - escopo (outra empresa → 404, não admin sem vínculo → não vê);
  - permissões (403);
  - validações (400);
  - tasks idempotentes;
  - datas com `timezone.localdate()` mockado;
  - Gemini sempre mockado.

**Frontend**
- Chamadas de API em `frontend/lib/<dominio>.js`. Use o padrão `parseApiError` para mostrar os erros do DRF.
- Use `C`, `Icons` e os componentes de `ui/index.js`. Ícones novos (ex.: `calendar`, `clock`, `trendUp`, `trendDown`, `layers`) entram em `Icons`, no estilo stroke 24×24.
- Se precisar estender `Btn`, `Select` ou `Tooltip` (ex.: `disabled` no `Select`, foco no `Tooltip`, `aria-label` no `Btn`), faça de forma **retrocompatível**.
- Não adicione biblioteca de UI ou de gráficos sem justificar. Sparklines e barras simples saem em SVG puro.
- Lógica de cálculo e formatação fica em funções puras em `lib/` (como `riskMap.js`), não dentro do JSX.
- Formatação pt-BR com `Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 0 })` e `toLocaleDateString("pt-BR")`.

**Git e entrega**
- Uma branch por feature (`feat/agendamento-manutencao`, `feat/previsao-risco`) e commits no padrão do histórico (`feat(manutencao): ...`, `fix(...)`, `test: ...`, `docs: ...`).
- **Não adicione `Co-Authored-By` nos commits nem rodapé "Generated with Claude Code" nos PRs.**
- Não faça commit nem push sem pedido explícito.
- Documente cada feature em `docs/agendamento_manutencao.md` e `docs/previsao_risco.md`, no estilo de `docs/triagem_ia.md` (o que faz, arquivos, como funciona, erros, configuração, limitações, melhorias futuras).

---

## 6. Feature 1 — Agendamento de manutenções no Inventário

### 6.1 Objetivo
Na aba **Inventário**, o admin agenda manutenções **preventivas** (e **preditivas**, que já existem no enum), **pontuais** ou **recorrentes**, para **um equipamento** ou para **um conjunto de equipamentos**. O sistema gera as OS na data certa, sem duplicar, avisa com antecedência e mostra uma agenda das próximas ocorrências.

### 6.2 Escopo funcional
- **Alvo**: um equipamento **ou** um conjunto (exatamente um dos dois).
- **Recorrência**:
  - `pontual`: uma data.
  - `recorrente`: a cada N dias, com atalhos na UI (semanal 7, quinzenal 15, mensal 30, trimestral 90, semestral 180, anual 365, personalizado).
  - Recorrência por mês de calendário só se for barato. Se não for, deixe como melhoria futura.
- **Campos do agendamento**: data da primeira execução, fim opcional (data final **ou** nº de ocorrências), `dias_antecedencia` para gerar a OS (padrão 0), prioridade padrão da OS (padrão `media`, usando `OrdemServico.Prioridade`), técnico responsável sugerido (opcional, `UsuarioSetor` com perfil técnico da mesma empresa), duração estimada (horas, opcional), instruções/checklist (texto) e `ativo` (pausado ou não).
- **Conjuntos de equipamentos** (entidade nova): nome, descrição, empresa e membros. Um equipamento pode estar em vários conjuntos. Todos os membros são da mesma empresa e podem ser de setores diferentes. O admin faz o CRUD.
- **Execução** (task Celery):
  - Gera a OS de cada ocorrência que vence, já considerando `dias_antecedencia`.
  - Num conjunto, gera **uma OS por equipamento membro ativo** (ignora `inativo`), todas com `plano_origem` (decisão 10.2).
  - **Idempotente**: nunca cria duas OS para o mesmo `(plano, equipamento, data_prevista)`.
  - Não gera uma nova se já existir uma OS aberta ou em andamento desse plano para esse equipamento. Registra a ocorrência como "pulada", com motivo.
- **Notificações**:
  - A OS gerada por agendamento **notifica os admins da empresa**, porque precisa de aprovação e hoje as OS do sistema não notificam.
  - `PLANO_VENCENDO` vai para os admins (e para o técnico sugerido) X dias antes (configurável em settings, padrão 3), **uma única vez por ocorrência**.
- **Ações**: pausar, retomar, executar agora (gera a OS imediatamente) e pular a próxima ocorrência.
- **Coerência com a conclusão da OS**:
  - Quando a OS tem `plano_origem`, o modal "Concluir" em `TicketsPage.js` deve **pré-preencher** `proxima_manutencao` com a próxima ocorrência do plano (o técnico ainda pode editar).
  - A "Próxima manutenção" exibida no inventário é a mais próxima entre `Equipamento.proxima_manutencao` e a próxima ocorrência dos planos ativos.
- **Retrocompatibilidade**:
  - Os planos que já existem (equipamento + setor + `periodicidade_dias`) continuam funcionando sem migração manual de dados.
  - Os campos atuais da API mantêm o significado.
  - As OS geradas continuam passando pelo fluxo de aprovação.

### 6.3 Modelagem sugerida (compare com alternativas e justifique a escolha)
- **`ConjuntoEquipamento`** (`db_table="conjuntos_equipamento"`):
  - campos: `id_conjunto`, `nome`, `descricao`, `id_empresa` (FK), `equipamentos` (M2M com `Equipamento`) e `criado_em`;
  - `UniqueConstraint(id_empresa, nome)`;
  - `visiveis_para`: o admin vê os conjuntos da empresa, e os demais veem os conjuntos que têm ao menos um membro nos seus setores (`distinct()`).
- **`PlanoManutencao`**, estendido com migration aditiva:
  - `id_equipamento` passa a `null=True`;
  - novo `id_conjunto` (FK null);
  - `CheckConstraint(condition=...)` para exatamente um dos dois;
  - `recorrencia` (`pontual`/`recorrente`, padrão `recorrente` para as linhas antigas);
  - `periodicidade_dias` nulo só quando for pontual (validação);
  - `data_fim`, `max_ocorrencias`, `ativo`, `prioridade`, `dias_antecedencia`, `tecnico_sugerido` (FK `UsuarioSetor` null), `duracao_estimada_horas` e `instrucoes`.
  - A regra "setor do plano = setor do equipamento" continua para planos de equipamento. Em planos de conjunto, `id_setor` fica nulo.
  - Atualize `visiveis_para` para cobrir os planos de conjunto.
- **`ExecucaoPlano`** (`db_table="execucoes_plano"`), o log de ocorrências:
  - campos: `id_execucao`, `id_plano`, `id_equipamento`, `data_prevista`, `id_os` (null), `status` (`gerada`/`pulada`/`erro`), `motivo` e `criado_em`;
  - `UniqueConstraint(id_plano, id_equipamento, data_prevista)`. Ela garante a idempotência, serve de auditoria e vira dado de **cumprimento de preventiva** para a Feature 2.
- Alternativa a avaliar: um model `Agendamento` separado do `PlanoManutencao`. Só escolha esse caminho se ele simplificar e não duplicar regras.

### 6.4 Algoritmo de ocorrências
- Uma função pura `proximas_ocorrencias(plano, a_partir_de, limite)` no service, testada isoladamente e usada pela task, pela agenda e pelo preview da UI.
- Ancore no calendário do plano: `proxima_execucao += periodicidade` até passar de hoje. **Não use "hoje + periodicidade".**
- Ocorrências atrasadas (o worker ficou parado): gere **só a mais recente** e registre as anteriores como `pulada`, com motivo `atrasada` (decisão 10.3).
- Respeite `data_fim`, `max_ocorrencias` e `ativo`. O plano pontual se desativa depois de gerar a OS.
- Use `select_for_update()` ou a constraint única com tratamento de `IntegrityError` para que duas execuções simultâneas da task não dupliquem nada.

### 6.5 API
- `GET/POST/PATCH/DELETE /api/conjuntos-equipamento/`: a escrita recebe `equipamentos: [ids]`, e a leitura devolve os membros com `id_equipamento`, `tag`, `nome` e `setor_nome`, além da contagem.
- `/api/planos-manutencao/`: os campos novos e filtros `?id_equipamento=&id_conjunto=&ativo=&tipo=`, implementados em `get_queryset` (sem adicionar django-filter).
- Actions do plano:
  - `POST /api/planos-manutencao/{id}/pausar/`
  - `POST /api/planos-manutencao/{id}/retomar/`
  - `POST /api/planos-manutencao/{id}/executar-agora/`
  - `POST /api/planos-manutencao/{id}/pular-proxima/`
- `GET /api/planos-manutencao/agenda/?inicio=AAAA-MM-DD&fim=AAAA-MM-DD`:
  - devolve as ocorrências projetadas (não persistidas) + as `ExecucaoPlano` do período;
  - status por ocorrência: `prevista` | `gerada` | `pulada` | `atrasada`;
  - janela máxima de 366 dias (400 se passar);
  - respeita a visibilidade.
- `GET /api/planos-manutencao/{id}/execucoes/`: o histórico.
- Escrita (POST/PATCH/DELETE/actions): **só admin** (recomendação, decisão 10.1). A leitura respeita `visiveis_para`.

### 6.6 Frontend (Inventário)
- A página ganha uma navegação interna (abas ou segmented control): **Equipamentos** | **Conjuntos** | **Agenda**.
- **Equipamentos**:
  - coluna "Próx. manutenção" (vinda dos planos, carregados uma vez);
  - botão **Agendar** por linha (admin);
  - seleção múltipla com ações "Agendar para selecionados" e "Criar conjunto com selecionados".
- **Modal "Agendar manutenção"**:
  - alvo (equipamento ou conjunto, com busca), tipo, pontual/recorrente, data inicial, periodicidade (atalhos + personalizado), fim, antecedência, prioridade, técnico sugerido, duração e instruções;
  - **preview das próximas 5 ocorrências** (pelo endpoint de agenda ou por uma função pura espelhada, testada contra os mesmos casos do backend);
  - erros do DRF exibidos por campo quando possível.
- **Conjuntos**: lista (nome, nº de membros, setores) e modal de criar/editar com multi-seleção pesquisável de equipamentos.
- **Agenda**:
  - lista agrupada por semana/mês, com filtros (tipo, setor, conjunto, status);
  - ocorrências atrasadas em destaque;
  - ações por plano (editar, pausar/retomar, executar agora, excluir) só para admin.
- **Modal de detalhe do equipamento**: seção "Manutenções agendadas" (planos e próximas datas) e "Histórico de execuções".
- Técnico e operador veem tudo em modo leitura, sem botões de escrita.
- Corrija o N+1 descrito em 4.6 sem mudar o comportamento visível.

### 6.7 Critérios de aceite (todos com teste automatizado no backend)
1. O admin cria um agendamento recorrente para um equipamento e a agenda mostra as próximas ocorrências corretas.
2. O admin cria um agendamento para um conjunto de 3 equipamentos, sendo 1 inativo. No vencimento a task gera exatamente 2 OS, com `plano_origem`, e 2 `ExecucaoPlano` com status `gerada`, mais 1 com status `pulada`.
3. Rodar a task duas vezes no mesmo dia não duplica nenhuma OS.
4. Um plano com o worker parado por 3 ciclos gera só a OS mais recente e registra as anteriores como `pulada/atrasada`.
5. `dias_antecedencia=2` gera a OS 2 dias antes da `data_prevista`.
6. A OS gerada notifica os admins da empresa, e `PLANO_VENCENDO` é enviado uma única vez por ocorrência.
7. Plano pausado não gera OS. Ao retomar, ele não "recupera" ocorrências passadas além da regra 6.4.
8. Plano pontual gera uma OS e se desativa.
9. Operador e técnico recebem 403 em toda escrita e só leem dentro da própria visibilidade. O admin de outra empresa recebe 404.
10. Não é possível pôr num conjunto um equipamento de outra empresa (400) nem criar um plano com equipamento **e** conjunto ao mesmo tempo, ou sem nenhum dos dois (400).
11. Os planos antigos continuam funcionando e os testes antigos passam (com `test_campos_da_resposta` atualizado de propósito).
12. Concluir uma OS com `plano_origem` pré-preenche a próxima data, e o fluxo de aprovação e conclusão continua igual.

---

## 7. Feature 2 — Previsão de risco no Mapa de Risco

### 7.1 Objetivo
Deixar o mapa mais informativo. Cada **equipamento aparece em texto** dentro do seu setor, com uma etiqueta **acima dele** que mostra a previsão de risco com precisão adequada: probabilidade de falha no horizonte escolhido, faixa de incerteza, nível, tendência e confiança. O clique leva aos fatores que explicam a previsão. O setor mostra o risco agregado dos seus equipamentos.

### 7.2 Princípio de arquitetura (não negociável)
- **O número vem de um modelo estatístico/ML calculado no backend.** LLM não faz previsão numérica.
- O Gemini, se usado, só **redige a explicação** a partir de fatos estruturados que o backend já calculou. Os números exibidos na tela vêm sempre do backend, nunca do texto do LLM.
- **Partida a frio (cold start)**: o banco está vazio e o IoT é simulado. Por isso a solução é em camadas e cada camada funciona sem a seguinte.

### 7.3 Definições
- **Falha (evento)**: abertura de uma OS **corretiva** não cancelada para o equipamento. Avalie também contar a OS preditiva de anomalia de severidade alta (decisão 10.6).
- **Horizontes**: 7, 30 e 90 dias (padrão 30).
- **Exposição**: dias em operação (ver 4.10).
- **Níveis**: `baixo` / `medio` / `alto` / `critico`, com limiares por horizonte em **uma única config** (sugestão para 30 dias: <10%, 10–25%, 25–50%, ≥50%). Equipamento `inativo` fica "sem previsão". `em_manutencao` aparece como estado, com a previsão esmaecida.

### 7.4 Camada 1 — Modelo estatístico bayesiano (padrão, sem novas dependências)
- **Taxa de falhas com encolhimento hierárquico (Gamma-Poisson)**:
  - o prior vem da taxa agrupada do `TipoEquipamento`, que cai para a taxa da empresa e depois para um padrão global;
  - a força do prior equivale a K dias de exposição (configurável);
  - posterior: `λ = (α0 + n_falhas) / (β0 + T_exposicao)`.
  - Assim um equipamento novo ou com pouco histórico herda o comportamento do seu tipo.
- **Modificadores de risco (hazard ratios)**:
  - lista central, documentada e testada;
  - entram como fatores multiplicativos sobre λ;
  - fatores:
    - preventiva vencida (por dias de atraso, com teto);
    - baixo cumprimento de preventivas (`ExecucaoPlano`);
    - anomalias IoT recentes (decaimento exponencial, meia-vida ~7 dias, peso por severidade);
    - OS ativa de prioridade alta/crítica;
    - corretivas recentes (reincidência);
    - idade (opcional).
  - Os valores iniciais são palpites de especialista. Declare isso no código e na doc. A Camada 2 substitui esses valores por coeficientes aprendidos.
- **Saídas por horizonte H**:
  - `p = 1 − exp(−λ_ajustado · H)`;
  - **intervalo de 80%** por Monte Carlo do posterior Gamma (`random.Random(seed).gammavariate`, cerca de 2000 amostras, determinístico nos testes; ver 4.16);
  - `score` de 0 a 100 e `nivel`;
  - **confiança** (`alta`/`media`/`baixa`) pelo volume de dados (nº de eventos, exposição, se há IoT);
  - **janela estimada da próxima falha** (mediana `ln2/λ`, com faixa), exibida só quando a confiança não for baixa;
  - **fatores**: lista ordenada de `{codigo, descricao, impacto_relativo}`, ex.: "Preventiva vencida há 12 dias (+35%)".
- **Agregado do setor**: `P(≥1 falha) = 1 − Π(1 − p_i)` (assume independência; documente isso) e `falhas_esperadas = Σ λ_i · H`.
- Tudo em funções puras num módulo próprio, ex.: `backend/risco/modelo_estatistico.py`. Recomendo uma **app nova `risco`** para isolar esse domínio. Registre-a em `INSTALLED_APPS` e em `config/urls.py`.

### 7.5 Camada 2 — ML supervisionado (opcional, ativado por dados suficientes)
- **Dataset point-in-time**:
  - snapshots semanais `(equipamento, data d)`, com features calculadas **só com informação ≤ d**, e rótulo = falha em `(d, d+H]`;
  - **proibido** usar `Equipamento.status` atual ou qualquer dado posterior a d (ver 4.9).
- **Features candidatas**: dias desde a última manutenção, dias de atraso da preventiva, cumprimento de preventivas, corretivas em 30/90/180 dias, dias desde a última corretiva, MTTR médio, anomalias por severidade com decaimento, `tem_iot`, idade, tipo (com encolhimento), reaberturas.
- **Modelos**:
  - primeiro **PoissonRegressor** ou **LogisticRegression** regularizados (interpretáveis: os coeficientes viram os hazard ratios da Camada 1);
  - **HistGradientBoostingClassifier** só se houver volume e se ele superar o modelo linear;
  - **calibração** (`CalibratedClassifierCV`).
- **Avaliação**:
  - validação temporal (rolling origin), nunca aleatória;
  - métricas: Brier, log-loss, ROC-AUC, PR-AUC e curva de calibração;
  - **promova o modelo só se ele superar a Camada 1 no Brier do holdout.**
- **Gate de ativação**: mínimo de eventos positivos e de dias de histórico, ambos configuráveis (ex.: ≥30 falhas e ≥90 dias). Abaixo disso o sistema fica na Camada 1 e informa o motivo.
- **Persistência**:
  - model `ModeloRisco` (versão, algoritmo, horizonte, features, métricas em JSON, `treinado_em`, `ativo`, caminho do artefato);
  - artefato `joblib` num diretório no `.gitignore`;
  - comando `python manage.py treinar_modelo_risco` e task semanal opcional.
- **Dependências**: scikit-learn, numpy e joblib, com versões fixas compatíveis com Python 3.12 (ver 4.1 sobre a codificação do `requirements.txt`). **Importe de forma preguiçosa**: sem essas libs, o sistema roda normalmente na Camada 1.

### 7.6 Camada 3 — Explicação em linguagem natural com Gemini (opcional)
- Só **sob demanda** no detalhe de um equipamento (`POST /api/risco/equipamentos/{id}/explicar/`), nunca no render do mapa inteiro.
- Copie o padrão de `triagem_ia.py`:
  - saída estruturada (`resumo` com 2–3 frases, `acao_recomendada`, `urgencia` em enum);
  - fatos estruturados como entrada;
  - **nomes e descrições de equipamentos tratados como dado** dentro de um marcador aleatório, porque são texto livre do usuário e portanto vetor de injeção;
  - retry com backoff, validação estrita, logs sem conteúdo e um throttle próprio (`risco_ia`).
- Cache por `(equipamento, snapshot)`.
- Fallback por **template determinístico** quando o Gemini estiver indisponível ou sem chave. A tela nunca quebra por causa da IA.
- Badge "Gerado por IA" e aviso de privacidade da camada gratuita, como na triagem.

### 7.7 Dados sintéticos para demonstração (necessário, porque o banco está vazio)
- Comando `python manage.py gerar_historico_sintetico --dias 365 --seed 42 [--empresa ID]`:
  - cria tipos com perfis de falha diferentes (Weibull por tipo);
  - simula corretivas passadas (OS concluídas com datas retroativas; ver 4.7);
  - simula preventivas que reduzem o risco, `ExecucaoPlano` com bom e mau cumprimento, e anomalias IoT que **antecedem** as falhas, para haver sinal aprendível.
- Marque tudo como sintético (ex.: prefixo `[SINTÉTICO]` no título da OS ou outro marcador que não exija migration) e ofereça `--limpar`.
- Recuse rodar com `DEBUG=False`, a menos que venha `--force`.
- A doc e a UI devem deixar claro que métricas obtidas com dados sintéticos **só validam o pipeline**, não a qualidade real do modelo.

### 7.8 Persistência, cálculo e atualização
- **`PrevisaoRisco`** (`db_table="previsoes_risco"`):
  - campos: `id_previsao`, `id_equipamento`, `horizonte_dias`, `probabilidade`, `intervalo_inferior`, `intervalo_superior`, `score`, `nivel`, `confianca`, `fatores` (JSON), `modelo` (ex.: `estatistico_v1`, `ml_v3`), `calculado_em` e `explicacao_ia` (null);
  - índice em `(id_equipamento, horizonte_dias, -calculado_em)`;
  - mantenha o histórico, que serve para a **tendência** e para medir a **precisão**, com uma política de retenção (ex.: 180 dias).
- **Task `calcular_previsoes_risco`**: no beat a cada hora e também disparada (com debounce) quando uma OS é aberta ou concluída ou surge uma anomalia, recalculando só o equipamento afetado.
- **Fallback síncrono**: se não houver snapshot recente (mais antigo que X horas), o endpoint calcula na hora. A Camada 1 é barata e **o Celery muitas vezes não está rodando em dev**.
- **Medição de precisão (backtesting)**: para previsões feitas há ≥ H dias, compare com o que de fato aconteceu e calcule Brier e calibração por faixa. Exponha em `/api/risco/modelo/`. Sem histórico suficiente, a resposta diz isso explicitamente.

### 7.9 API (app `risco`, rotas em `/api/risco/`)
- `GET /api/risco/mapa/?horizonte=30`: **uma única chamada** que substitui as 3 de hoje. Respeita `visiveis_para`.
  ```json
  {
    "gerado_em": "...", "modelo": "estatistico_v1", "horizonte_dias": 30,
    "setores": [{
      "id_setor": 1, "nome": "Utilidades",
      "risco_atual": "medium",
      "probabilidade_alguma_falha": 0.61, "falhas_esperadas": 1.4, "nivel": "alto",
      "equipamentos": [{
        "id_equipamento": 3, "tag": "BOMBA-01", "nome": "Bomba centrífuga",
        "status": "ativo", "tem_iot": true,
        "probabilidade": 0.23, "intervalo": [0.15, 0.31], "nivel": "medio", "score": 23,
        "tendencia": 0.05, "confianca": "media",
        "proxima_manutencao": "2026-11-02", "fator_principal": "Preventiva vencida há 12 dias"
      }]
    }]
  }
  ```
  `risco_atual` é a regra de estado que já existe, migrada do front para o back ou mantida no front (decida). `tendencia` é a diferença em relação ao snapshot de cerca de 7 dias atrás.
- `GET /api/risco/equipamentos/{id}/?horizonte=30`: detalhe, os 3 horizontes, fatores completos, histórico dos últimos snapshots (sparkline), últimas OS e anomalias, e próximos agendamentos (Feature 1).
- `POST /api/risco/equipamentos/{id}/explicar/`: Camada 3, com throttle.
- `POST /api/risco/recalcular/`: só admin, com throttle.
- `GET /api/risco/modelo/`: modelo ativo, camada em uso, métricas, gate de dados (quanto falta para a Camada 2) e precisão histórica.

### 7.10 Frontend (Mapa de Risco)
- **Cada equipamento em texto dentro do setor**: um chip com `TAG · Nome`, com uma **pill acima** mostrando `23% · 30d`, cor por nível, seta de tendência ▲/▼, pulso IoT e ícone de estado (em manutenção/inativo).
- Se um setor tiver mais equipamentos do que cabem, mostre os N de maior risco e um "+N outros" expansível. Nada se sobrepõe e o texto continua legível de 1 a 30 equipamentos por setor.
- **Cabeçalho do setor**: nome, nível agregado e "P(≥1 falha em 30d) 61% · 1,4 falhas esperadas".
- **Controles**: horizonte (7/30/90), alternância **Risco atual** (estado) ↔ **Risco previsto**, filtros (nível mínimo, tipo, só IoT), busca que destaca um equipamento e botão "Atualizar".
- **Painel lateral ao clicar no equipamento**:
  - probabilidade com faixa, nível, confiança e janela estimada da próxima falha;
  - **fatores principais com impacto**;
  - sparkline de tendência (SVG puro);
  - últimas OS e anomalias e próxima manutenção agendada;
  - explicação (IA ou template, com badge);
  - botões **Agendar preventiva** (admin, reutiliza o modal da Feature 1 já preenchido) e **Abrir chamado**.
- **Ranking textual** "Top 10 equipamentos em risco" ao lado do mapa.
- **Rodapé de transparência**: "Modelo estatístico v1 · calculado há 12 min · confiança média · dados IoT simulados" e, quando existir, "precisão histórica (Brier) ...".
- **Precisão sem falsa precisão**: percentuais inteiros, faixas tipo "15–31%" e nada de "23,4817%". Em confiança baixa, destaque a faixa mais do que o ponto.
- **Renderização**:
  - Hoje é SVG `680×480` com `getZoneGeometry`, e o SVG não quebra texto.
  - Recomendação: migrar as zonas para **HTML/CSS** (grid de setores com chips em flex-wrap), mantendo o visual de "planta" (borda tracejada e grade de fundo em CSS). A alternativa é SVG + `foreignObject`. Justifique a escolha.
  - Requisitos: **acessível pelo teclado** (`tabIndex`, `aria-label` completo, ex.: "BOMBA-01, risco médio, 23% em 30 dias, tendência de alta"), tooltip que abre também no foco e layout responsivo.
- Mantenha `lib/riskMap.js` como lugar das funções puras (formatação, ordenação, truncamento, cores por nível, incluindo a cor nova de `critico`).

### 7.11 Critérios de aceite
1. Sem dados históricos, todos os equipamentos ativos recebem uma previsão da Camada 1 com `confianca="baixa"`, e a UI deixa isso claro.
2. Com o histórico sintético, os equipamentos com mais corretivas e preventivas atrasadas aparecem com risco maior. Teste isso de forma determinística (seed fixa).
3. A previsão de 90 dias é sempre maior ou igual à de 30 dias, que é maior ou igual à de 7 dias, e o intervalo contém o ponto.
4. O agregado do setor confere com as fórmulas de 7.4.
5. `/api/risco/mapa/` respeita a visibilidade: outra empresa não aparece, e o operador só vê os equipamentos dos seus setores.
6. O endpoint funciona sem Celery e sem snapshot (fallback síncrono).
7. Sem scikit-learn instalado o sistema funciona (Camada 1). Com as libs e dados abaixo do gate, ele informa o motivo e continua na Camada 1.
8. A explicação por IA com o Gemini mockado devolve texto validado. Com o Gemini indisponível, o template aparece e a tela não quebra. A injeção no nome do equipamento não altera os números.
9. O mapa mostra os equipamentos em texto com a pill de risco, funciona pelo teclado e não sobrepõe chips com 30 equipamentos num setor.
10. "Agendar preventiva" no painel abre o modal da Feature 1 já preenchido.

---

## 8. Integração entre as features
- As `ExecucaoPlano` (cumprimento) e os planos vencidos alimentam a Camada 1 como fatores de risco.
- No modal de agendamento, mostre como **dica** uma "data recomendada": quando a probabilidade acumulada do equipamento passar de um limiar configurável (ex.: 20%). Isso é opcional e o usuário decide.
- O mapa usa os próximos agendamentos no painel e o botão de agendar.

---

## 9. Plano de execução em fases

Ao final de cada fase:
- rode `cd backend && venv\Scripts\python.exe manage.py test`;
- rode `makemigrations --check`;
- rode `cd frontend && npx eslint <arquivos tocados>`;
- quando houver mudança de front, rode `npm run build`;
- reporte o resultado.

| Fase | Entrega |
|---|---|
| **0. Reconhecimento (sem editar)** | Ler os arquivos da seção 3, rodar `migrate` e a suíte (confirmar 275), confirmar cada armadilha da seção 4 e responder: plano detalhado (models e campos, migrations, endpoints, componentes, esboço ASCII das telas) + **as decisões da seção 10 com a sua recomendação**. **Pare e espere aprovação.** |
| 1. Backend do agendamento | `ConjuntoEquipamento`, extensão de `PlanoManutencao`, `ExecucaoPlano`, `proximas_ocorrencias`, task idempotente, notificações, endpoints, permissões e testes dos critérios 6.7 |
| 2. Frontend do agendamento | Abas do Inventário, modal de agendar com preview, conjuntos, agenda, correção do N+1, pré-preenchimento na conclusão da OS |
| 3. Backend do risco (Camada 1) | App `risco`, modelo estatístico, `PrevisaoRisco`, task + fallback síncrono, `/api/risco/*`, `gerar_historico_sintetico` e testes 7.11 (1–7) |
| 4. Frontend do mapa | Novo layout com equipamentos em texto e pills, controles, painel, ranking, transparência e acessibilidade |
| 5. Camada 3 (Gemini) | Explicação sob demanda com fallback (se aprovado na decisão 10.8) |
| 6. Camada 2 (ML) | Dataset point-in-time, treino e avaliação temporal, gate, `ModeloRisco`, backtesting (se aprovado na decisão 10.9) |
| 7. Fechamento | `docs/agendamento_manutencao.md`, `docs/previsao_risco.md`, atualização do README (endpoints e comandos novos) e relatório final |

As fases 1–2 e 3–4 devem ir para branches/PRs separados.

---

## 10. Decisões para o usuário confirmar na Fase 0 (recomendação entre parênteses)

1. Quem pode criar, editar e excluir agendamentos e conjuntos? (Só admin. Técnico e operador apenas leem.)
2. Agendamento de conjunto: uma OS por equipamento ou uma OS para o conjunto? (Uma por equipamento, que preserva aprovação, status do equipamento e risco por equipamento.)
3. Ocorrências atrasadas com o worker parado: gerar todas ou só a mais recente? (Só a mais recente, registrando as demais como puladas.)
4. Permitir "corretiva programada" pontual além de preventiva/preditiva? (Opcional; sim, só para agendamento pontual.)
5. O técnico sugerido no agendamento já entra atribuído na OS ou só é sugerido na aprovação? (Só sugerido, mantendo a regra de que toda OS aberta passa pelo admin.)
6. O que conta como "falha" no modelo? (OS corretiva não cancelada. Avaliar incluir preditiva de anomalia alta.)
7. Horizonte padrão e limiares de nível? (30 dias; <10 / 10–25 / 25–50 / ≥50%.)
8. Usar o Gemini para a explicação? (Sim, sob demanda e com fallback por template. Atenção à cota e à privacidade da camada gratuita.)
9. Adicionar scikit-learn agora? (Não. Implementar a Camada 1 agora e deixar a Camada 2 pronta para ligar quando houver dados reais.)
10. Corrigir o `crontab(hour='*/1')`, que roda a cada minuto? (Sim, `crontab(minute=0)` em commit separado, ou manter e documentar se a frequência alta for desejada para o agendamento.)
11. Layout do mapa: migrar para HTML/CSS ou manter SVG com `foreignObject`? (HTML/CSS.)

---

## 11. Definição de pronto
- Todos os testes passam (os 275 anteriores + os novos), e os novos cobrem cada critério de aceite marcado como testável.
- `makemigrations --check` limpo, migrations só aditivas e reversíveis.
- ESLint limpo nos arquivos tocados e `npm run build` sem erro.
- Os fluxos existentes não regridem: abrir, aprovar, iniciar e concluir OS, triagem por IA, IoT mock e notificações.
- Documentação criada e README atualizado.
- **Relatório final**:
  - o que foi feito, por fase;
  - arquivos criados e alterados;
  - decisões tomadas e por quê;
  - como testar manualmente (passo a passo com `seed_mock_data`, `gerar_historico_sintetico`, `runserver`, worker/beat e `npm run dev`);
  - limitações conhecidas, o que **não** foi verificado e próximos passos.

## 12. Fora de escopo
Integração com IoT real, websockets ou push em tempo real, edição da planta por arrastar e soltar (posições manuais dos equipamentos podem ficar como melhoria futura), migração para TypeScript, troca de biblioteca de UI, mudanças de autenticação e refatorações sem relação com estas duas features.
