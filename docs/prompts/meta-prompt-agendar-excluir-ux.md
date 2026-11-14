# Meta prompt — Agendar preventiva no Inventário, excluir pelo Mapa de Risco e melhorias de UX

> **Nota (nov/2026): este prompt está desatualizado. Não execute sem revisar.**
>
> - **Item 1 (agendar preventiva) foi substituído e NÃO deve ser executado**: virou a aba **Preventivas**
>   (branch `feat/aba-preventivas`, ver `docs/manutencao_preventiva.md`), que também cobre o botão
>   "Agendar" no Inventário, a coluna "Próx. Manut." e a notificação da OS gerada.
> - **Item 2 (excluir pelo mapa)**: o projeto seguiu outro caminho. Setores e equipamentos são
>   **desativados** em vez de excluídos, e a escrita deles já é só admin. Reavalie antes de usar.
> - **Item 3 (cardápio Q1–Q14)**: já resolvidos Q1 (datas um dia antes), Q4 (`crontab`), Q6 (escrita só
>   admin em setor e equipamento), Q7 (Esc e foco no Modal) e o ícone `edit`/edição de equipamento do Q10.
>   Os demais continuam em aberto.

## 0. Missão

Implementar no sistema de manutenção industrial **squad-ceny-pi** (Django + Next.js), neste repositório:

1. **Botão de agendar manutenção preventiva no Inventário.** O admin agenda uma preventiva recorrente para um equipamento, vê as manutenções agendadas e edita ou exclui.
2. **Excluir setores e equipamentos pelo Mapa de Risco**, de forma segura: mostrar o impacto antes, bloquear o que destruiria dados e permitir só para admin.
3. **Melhorias de QOL/UX simples**, a partir de um cardápio (seção 7). Apresente o cardápio ao usuário e implemente **só o que ele escolher**.

**Fora desta etapa**: previsão de risco (IA/ML), conjuntos de equipamentos, agendamento pontual e agenda/calendário. Existe um meta prompt separado para isso, que será executado depois. **Não implemente nada dele**, mas também não tome decisões que o inviabilizem: não renomeie `PlanoManutencao`, não remova `proxima_execucao` nem `periodicidade_dias` e não mude o significado dos campos atuais.

**A Fase 0 é só leitura e plano. Não edite nenhum arquivo até o usuário aprovar o plano, responder às decisões da seção 9 e escolher os itens do cardápio.**

---

## 1. Papel e postura

- Atue como engenheiro full stack sênior (Django/DRF + Next.js/React), com cuidado especial com **operações destrutivas** e com **UX de interfaces administrativas**.
- Leia antes de editar e siga as convenções do código (seção 4). Mudanças pequenas e focadas, sem refatorar o que não faz parte da tarefa.
- Relate com fidelidade. Se um teste falhar, mostre a saída. Se algo não foi verificado (ex.: teste visual no navegador), diga isso.
- Se achar uma solução melhor do que a sugerida, proponha com justificativa antes de implementar.

---

## 2. Contexto verificado do projeto

### Stack (o `requirements.txt` e o `package.json` valem mais que o README, que está desatualizado)
- **Backend** (`backend/`):
  - Python 3.12, **Django 6.0.4**, DRF 3.17, SimpleJWT;
  - Celery 5.6 + django-celery-beat + Redis (Memurai no Windows);
  - SQLite por padrão;
  - DRF **sem paginação** (as listagens devolvem arrays) e **sem django-filter**.
- **Frontend** (`frontend/`):
  - **Next.js 16.2 (App Router), React 19.2, React Compiler ligado**, **JavaScript** (sem TypeScript), axios;
  - **nenhuma biblioteca de UI**: estilos inline com tokens `C` e ícones `Icons` de `frontend/lib/constants.js`, componentes de `frontend/app/components/ui/index.js` (`Ico`, `Badge`, `IoTBadge`, `Tooltip` só hover, `Modal`, `Input`, `Select`, `Btn`);
  - o `Btn` não repassa `type`, `title` nem `aria-*`;
  - **não existem os ícones `trash`, `calendar` e `edit`.**
- O dashboard troca a página por estado em `frontend/app/components/dashboard/DashboardShell.js`. **Hoje ele renderiza `<RiskMapPage />` sem passar o perfil**, então o mapa não sabe se o usuário é admin.

### Domínio relevante
- Multiempresa: `Empresa → Setor → Equipamento`. A visibilidade usa `QuerySet.visiveis_para(usuario)`: o admin vê a empresa toda, e os demais só os setores em que têm `UsuarioSetor`. A escrita valida "mesma empresa" com `empresas/validators.py::validar_mesma_empresa`.
- **`PlanoManutencao`** (`backend/manutencao/models.py`) já tem o necessário para o item 1:
  - `descricao` (até 500), `tipo` (`preventiva`/`preditiva`), `periodicidade_dias` (>0), `proxima_execucao` (date) e `ultima_manutencao`;
  - FK obrigatória `id_equipamento`;
  - `id_setor`, que **precisa ser igual ao setor do equipamento** (validado em `manutencao/serializers.py::PlanoManutencaoSerializer.validate`).
- **Geração da OS**: `manutencao/tasks.py::verificar_manutencoes_preventivas` gera a OS quando `proxima_execucao <= hoje` (via `services.criar_os_preventiva`, que reagenda para `hoje + periodicidade`) e ignora equipamentos `inativo`.
  - A OS nasce `aberta`, sem solicitante, com `plano_origem`, e **precisa de aprovação do admin** como qualquer OS.
  - **Hoje ninguém é notificado** quando ela é gerada, porque `NotificacaoService.notificar_abertura` depende de `solicitante`.
  - Sem worker e beat do Celery rodando, nenhuma OS é gerada.
- A conclusão da OS (`ordens_servico/services.py::OrdemServicoService.concluir`) exige `proxima_manutencao` e atualiza `Equipamento.ultima_manutencao/proxima_manutencao` e `PlanoManutencao.ultima_manutencao` do `plano_origem`.
- `LogAuditoria` (`notificacoes/models.py`) é gravado por signals só para `OrdemServico` e `PlanoManutencao`, e **sem usuário**.
- Comando de auditoria somente leitura: `python manage.py verificar_dados_cruzados` (`empresas/management/commands/`). Ele acusa, por exemplo, plano com setor diferente do setor do equipamento.

### O que a exclusão faz hoje no banco (`on_delete`), confirmado nos models

| Excluir | Relação | Efeito | Consequência para o usuário |
|---|---|---|---|
| **Setor** | `Equipamento.id_setor` | `SET_NULL` | Os equipamentos ficam sem setor e **somem de todas as telas, inclusive para o admin** (`visiveis_para` filtra por setor). As OS deles somem junto. |
| | `UsuarioSetor` | `CASCADE` | Os usuários perdem o vínculo e, com ele, a visibilidade. |
| | `PlanoManutencao.id_setor` | `SET_NULL` | Os planos ficam inconsistentes. |
| **Equipamento** | `PlanoManutencao` | `CASCADE` | Os planos são apagados. |
| | `AnomaliaIoT` | `CASCADE` | O histórico IoT é apagado. |
| | `OrdemServico.id_equipamento` | `SET_NULL` | As OS, **inclusive abertas ou em andamento**, ficam sem equipamento e **somem das listas** (`visiveis_para` filtra por equipamento→setor). |

**Permissões atuais**: `SetorViewSet`, `EquipamentoViewSet`, `TipoEquipamentoViewSet` e `PlanoManutencaoViewSet` só exigem `IsAuthenticated`. Na prática, **um operador consegue, pela API, excluir um setor da empresa inteira** e excluir equipamentos e planos dos seus setores. A UI esconde os botões, mas a API permite.

### Frontend atual
- `frontend/app/components/dashboard/pages/InventoryPage.js`:
  - tabela (ID, Equipamento, Setor, Tipo, Status, IoT, Última Manut., Ações→"Ver"), modal de detalhe e modais de cadastro (só admin: setor, tipo, equipamento);
  - `handleDeletarEquip` existe, mas **não é usado** (e usa `confirm()`/`alert()`).
- `frontend/lib/equipamentos.js`:
  - `getProximaManutencao` lê `response.results`, mas a API devolve array, e o backend ignora `?id_equipamento=`. O resultado é **sempre `null`**;
  - `carregarEquipamentos` faz **N+1 requisições sequenciais** (plano + IoT por equipamento).
- Mapa de risco:
  - `RiskMapPage`, em `frontend/app/components/dashboard/pages/OtherPages.js`, desenha os setores como retângulos SVG;
  - ao clicar num setor, um painel lateral HTML (240px) lista OS ativas e equipamentos;
  - dados: `/api/setores/` (todos os setores da empresa), `/api/equipamentos/` e `/api/ordens-servico/`;
  - funções puras em `frontend/lib/riskMap.js`.

### Testes
- Django `TestCase` com utilitários em `backend/config/testutils.py` (`BaseTestCase`, `Cenario`, `criar_*`, `vincular`).
- **Baseline: 275 testes passando** (`cd backend && venv\Scripts\python.exe manage.py test`). Confirme na Fase 0.
- O banco local está quase vazio. Popule com `python manage.py migrate` e `python manage.py seed_mock_data --with-os`. Logins do seed: `mariafernanda@uspe.com` (admin), `carlosulberg@uspe.com` (operador) e `tecnico@uspe.com` (técnico), todos com a senha `123456`.

---

## 3. Armadilhas confirmadas (leve todas em conta)

1. **Fuso horário**: `new Date("2026-10-20").toLocaleDateString("pt-BR")` mostra **19/10/2026** no Brasil, porque a string é lida como UTC. Isso afeta todo campo `DateField` exibido no front: `proxima_manutencao`, `proxima_execucao` e `data_instalacao`. Datas "só dia" precisam ser interpretadas como data local.
2. **`PATCH /api/equipamentos/{id}/` com `{"id_setor": null}` dá erro 500**: o DRF chama `validate_id_setor(None)` e o código faz `None.id_empresa`.
3. **`manutencao/tests.py::test_campos_da_resposta` compara o conjunto exato de campos do plano.** Se adicionar campos, atualize esse teste de propósito.
4. **Dois testes garantem que um operador consegue criar setor e tipo (201)**: `empresas/tests.py::SetorViewSetTests::test_criar_forca_empresa_do_usuario` e `equipamentos/tests.py::TipoEquipamentoViewSetTests::test_criar_forca_empresa_do_usuario`. Restringir só o **DELETE** não os afeta. Restringir também a **criação** (item Q6) exige atualizá-los.
5. `config/celery.py`: `crontab(hour='*/1')` roda **a cada minuto** (o `minute` padrão é `'*'`), embora o comentário diga "a cada hora".
6. **Django 6**: em `CheckConstraint` use `condition=`, porque `check=` foi removido. Prefira `UniqueConstraint`.
7. Com o React Compiler ligado, não mute estado nem props.
8. `frontend/lib/api.js` fixa `BASE_URL`. Não mexa sem pedir.

---

## 4. Convenções obrigatórias

**Backend**
- Nomes, docstrings e mensagens em português do Brasil. Docstrings curtas no estilo do código; mensagens para o usuário com acento.
- A regra de negócio fica em **services** e as views ficam finas.
- Erros:
  - `ValueError` do service → 400 `{"detail": ...}`;
  - erro de regra com código para o front: `{"detail": ..., "codigo": "..."}` (padrão de `ordens_servico/views.py::TriagemIAPreviewView._erro`);
  - falta de permissão → 403 com mensagem em constante `MSG_...`.
- Para permissão, use `usuarios/permissions.py::IsAdmin` (com `get_permissions` por action, como em `empresas/views.py::EmpresaViewSet`).
- Migrations só aditivas (de preferência nenhuma nesta etapa). `python manage.py makemigrations --check` tem que ficar limpo.
- Notificações sempre via `NotificacaoService`.
- **Toda regra nova tem teste**: permissão (403), escopo (outra empresa → 404), validação (400), bloqueios de exclusão, contagens de dependências e notificações.

**Frontend**
- Chamadas de API em `frontend/lib/<dominio>.js`. Erros exibidos com o padrão `parseApiError`.
- Use `C`, `Icons` e os componentes de `ui/index.js`. Ícones novos (`trash`, `calendar`, `edit`) entram em `Icons` no estilo stroke 24×24 que já existe.
- Extensões em `Btn`, `Modal` e `Select` precisam ser **retrocompatíveis** (ex.: `Btn` passando `title`/`aria-label`).
- Lógica pura (datas, próximas ocorrências, formatação) fica em `lib/`, fora do JSX.
- Ações destrutivas usam um **modal de confirmação próprio** (não `confirm()`) que mostra o impacto. O botão de confirmar usa a variante `danger` e fica desabilitado enquanto processa.
- Admin vê os botões de escrita; técnico e operador veem tudo só para leitura.

**Git**
- Uma branch por item (`feat/agendar-preventiva`, `feat/excluir-pelo-mapa`, `fix/ux-melhorias`), com commits no padrão do histórico (`feat(manutencao): ...`, `fix(equipamentos): ...`, `test: ...`).
- **Sem `Co-Authored-By` nos commits e sem rodapé "Generated with Claude Code" nos PRs.**
- Não faça commit nem push sem pedido explícito.

---

## 5. Item 1 — Agendar manutenção preventiva no Inventário

### 5.1 Comportamento esperado
- **Onde aparece o botão** (só admin):
  1. No cabeçalho do Inventário: **"Agendar Manutenção"**, ao lado de "Cadastrar Equipamento". Abre o modal com o equipamento a escolher.
  2. Em cada linha da tabela: um botão **"Agendar"** (ícone `calendar`) ao lado de "Ver". Abre o modal com o equipamento já escolhido e travado.
  3. No modal de detalhe do equipamento: uma seção **"Manutenções agendadas"** com o botão **"+ Agendar"**.
- **Modal "Agendar manutenção preventiva"**:
  - **Equipamento**: `Select` com "TAG — Nome (Setor)". Equipamento sem setor ou `inativo` não pode ser escolhido (aparece desabilitado ou com um aviso explicando o motivo).
  - **O que será feito**: textarea obrigatória com contador (máx. 500) → `descricao`.
  - **Primeira execução**: `input type="date"`, com `min` = hoje e padrão = hoje → `proxima_execucao`.
  - **Repetir a cada**: atalhos (Semanal 7, Quinzenal 15, Mensal 30, Trimestral 90, Semestral 180, Anual 365) + campo "personalizado (dias)" → `periodicidade_dias`.
  - **Preview**: "Próximas execuções: 20/10/2026, 19/11/2026, 19/12/2026" (3 a 5 datas, função pura em `lib/`).
  - **Aviso**: "Na data, uma OS preventiva é criada automaticamente e fica aguardando aprovação em Chamados."
  - `tipo` fixo em `preventiva`. `id_setor` é preenchido **automaticamente** com o setor do equipamento, porque o backend exige que sejam iguais.
  - Erros de validação aparecem por campo quando o DRF os devolver por campo.
- **Detalhe do equipamento**: lista os planos (descrição, "a cada N dias", próxima execução, última execução), com **Editar** (o mesmo modal em modo edição, via PATCH) e **Excluir** (modal de confirmação) para admin.
- **Tabela**:
  - nova coluna **"Próx. manutenção"**: a data mais próxima entre `Equipamento.proxima_manutencao` e o `proxima_execucao` dos planos do equipamento;
  - destaques: badge **"Atrasada"** (vermelho) se a data já passou, **"Hoje"** e **"em N dias"** (âmbar até 7 dias);
  - sem planos nem data: "—".
- **Feedback de sucesso** depois de salvar (ex.: "Manutenção agendada para 20/10/2026"). A tabela e o detalhe se atualizam sem recarregar a página.

### 5.2 Backend
- `PlanoManutencaoViewSet`:
  - **escrita (POST/PUT/PATCH/DELETE) só para admin**; leitura igual à de hoje (`visiveis_para`);
  - filtro opcional `?id_equipamento=` em `get_queryset`, sem adicionar django-filter.
- `PlanoManutencaoSerializer`:
  - `proxima_execucao` não pode ser anterior a hoje na criação, nem na edição quando o campo muda (400 com mensagem clara);
  - mantenha as validações que já existem.
- **Notificação da OS gerada pelo agendamento**: quando `criar_os_preventiva` cria a OS, notifique os admins ativos da empresa do equipamento. Crie um método novo no `NotificacaoService`, ex.: `notificar_os_sistema(ordem)`, tipo `OS_ABERTA`, título "OS #N preventiva aguardando aprovação". Sem isso, a OS agendada fica parada sem que ninguém perceba.
- **Sem migrations nesta etapa**: o model atual basta.

### 5.3 Frontend
- Funções de plano em `frontend/lib/` (ex.: `lib/planosManutencao.js`): `listarPlanos`, `criarPlano`, `atualizarPlano`, `excluirPlano`.
- **Corrija o carregamento do Inventário**:
  - os planos vêm em **uma única chamada** (`GET /api/planos-manutencao/`), indexados por `id_equipamento` em memória;
  - o IoT é buscado com `Promise.all` em vez de um `await` por equipamento num `for`;
  - remova ou substitua o `getProximaManutencao` quebrado.
- Helper de datas, ex.: `lib/datas.js`:
  - `formatarData(valor)` trata `AAAA-MM-DD` como data local e datetimes normalmente;
  - funções puras `proximasExecucoes(dataInicial, periodicidade, n)` e `diasAte(data)`.
- O modal pode ficar num componente próprio (ex.: `app/components/dashboard/AgendarManutencaoModal.js`) para ser reutilizado depois pelo mapa.
- Equipamento inativo: o botão "Agendar" fica desabilitado com um tooltip explicando ("Equipamento inativo não gera OS automática").

### 5.4 Critérios de aceite
1. O admin agenda pelo cabeçalho, pela linha e pelo detalhe. O plano é criado com `tipo=preventiva` e o setor do equipamento.
2. A coluna "Próx. manutenção" mostra a data correta (sem o erro de fuso) e os badges Atrasada, Hoje e em N dias.
3. O detalhe lista os planos, e editar e excluir funcionam.
4. Operador e técnico não veem os botões. A API devolve 403 em POST, PATCH e DELETE de plano, e a leitura continua funcionando.
5. `proxima_execucao` no passado → 400.
6. Quando a task gera a OS do plano, os admins da empresa recebem a notificação. Há teste para isso.
7. O Inventário faz uma única requisição de planos, não uma por equipamento.
8. Todos os testes antigos passam, e os novos cobrem os itens 4, 5 e 6.

---

## 6. Item 2 — Excluir setores e equipamentos pelo Mapa de Risco

### 6.1 Regras de exclusão (recomendadas; confirme na decisão 9.2)
- **Só admin**, e só dentro da própria empresa (o que é de outra empresa dá 404 pelo queryset).
- **Setor**:
  - **bloqueia** se ainda tiver equipamentos (`codigo: "setor_com_equipamentos"`, com a contagem). Se não bloquear, os equipamentos somem do sistema (seção 2);
  - se estiver vazio, pode excluir. Avise quantos usuários perdem o vínculo e quantos planos ficam sem setor.
- **Equipamento**:
  - **bloqueia** se houver OS `aberta` ou `em_andamento` (`codigo: "equipamento_com_os_ativa"`);
  - **com histórico de OS** (concluída ou cancelada): **bloqueia a exclusão definitiva e oferece "Desativar"** (`status=inativo`, que o sistema já respeita: não gera OS automática, não aceita OS nova, não gera anomalia IoT). Isso preserva o histórico de OS, que hoje sumiria (`codigo: "equipamento_com_historico"`). Ver decisão 9.2;
  - sem OS: pode excluir. Avise que os planos e as anomalias IoT dele também serão apagados (com as contagens).
- A exclusão roda em `transaction.atomic()` e grava um `LogAuditoria` **com o usuário** (ex.: "Exclusão de setor: Utilidades"). O service conhece o usuário; o signal não.

### 6.2 Backend
- Services:
  - `empresas/services.py::SetorService.dependencias(setor)` e `.excluir(setor, usuario)`;
  - `equipamentos/services.py::EquipamentoService.dependencias(equipamento)`, `.excluir(equipamento, usuario)` e `.desativar(equipamento, usuario)` (se ainda não houver um caminho bom via PATCH).
- `dependencias` devolve um dict:
  ```json
  {"pode_excluir": false, "codigo": "setor_com_equipamentos", "motivo": "...",
   "equipamentos": 3, "usuarios_vinculados": 2, "planos": 1}
  ```
  ```json
  {"pode_excluir": false, "codigo": "equipamento_com_os_ativa", "motivo": "...",
   "os_ativas": 1, "os_historico": 4, "planos": 2, "anomalias_iot": 17}
  ```
- Endpoints:
  - `GET /api/setores/{id}/dependencias/` e `GET /api/equipamentos/{id}/dependencias/` (actions `detail=True`, só admin);
  - `DELETE` de setor e de equipamento: só admin (`IsAdmin` via `get_permissions` para `destroy`). Valida pelo service e, se bloqueado, responde 400 com `detail`, `codigo` e as contagens.
- Corrija junto o erro 500 de `id_setor: null` (armadilha 3.2): devolva 400 "O setor é obrigatório.", porque equipamento sem setor fica invisível.
- Testes:
  - exclusão permitida;
  - cada bloqueio;
  - contagens;
  - 403 para operador e técnico;
  - 404 entre empresas;
  - `LogAuditoria` com usuário;
  - nada apagado quando bloqueado.

### 6.3 Frontend
- `DashboardShell` passa `userType={perfil}` para `RiskMapPage`.
- No painel lateral do setor selecionado (só admin):
  - botão **"Excluir setor"** (ícone `trash`, variante discreta) no cabeçalho do painel;
  - em cada equipamento da lista, um botão só com o ícone `trash` e `aria-label`/`title` "Excluir equipamento TAG". O painel tem 240px, então não pode quebrar o layout.
- **Componente reutilizável** `ConfirmarExclusaoModal` (ex.: em `app/components/dashboard/`):
  - ao abrir, busca as `dependencias` e mostra um estado de carregamento;
  - se `pode_excluir`: lista o impacto ("2 planos de manutenção e 17 registros de IoT serão apagados") e mostra o botão **"Excluir"** (`danger`);
  - se bloqueado: mostra o motivo e as alternativas (equipamento com histórico → botão **"Desativar equipamento"**; setor com equipamentos → explica que é preciso mover ou excluir os equipamentos antes);
  - depois do sucesso: fecha, mostra feedback, recarrega o mapa (`carregarMapa`) e limpa a seleção se o setor sumiu (o `useEffect` atual já cuida disso).
- Reutilize o mesmo modal no Inventário (botão "Excluir" no detalhe do equipamento, só admin), no lugar do `handleDeletarEquip` morto, para manter a experiência consistente.
- **Opcional (decisão 9.3)**: no bloqueio de setor, oferecer "Mover equipamentos para…" (escolher o setor de destino → PATCH `id_setor` em cada equipamento → excluir). Se for implementar, **o backend também precisa atualizar o `PlanoManutencao.id_setor` dos planos do equipamento movido**. Sem isso o plano fica inconsistente e `verificar_dados_cruzados` acusa.

### 6.4 Critérios de aceite
1. O admin exclui um setor vazio pelo mapa, e o mapa se atualiza.
2. Setor com equipamentos → bloqueado com a contagem, e nada é apagado.
3. Equipamento sem OS → excluído, junto com os planos e anomalias avisados.
4. Equipamento com OS ativa → bloqueado. Com histórico → bloqueado com a opção de desativar (ou conforme a decisão 9.2).
5. Operador e técnico não veem os botões, e a API devolve 403 no DELETE e em `dependencias`.
6. Outra empresa → 404.
7. `LogAuditoria` registra a exclusão com o usuário.
8. `PATCH id_setor=null` → 400, não 500.

---

## 7. Item 3 — Cardápio de melhorias de QOL/UX

Apresente esta tabela na Fase 0, com a sua opinião, e implemente **só os itens escolhidos**. Os itens marcados com **bug** foram confirmados e são recomendados. Esforço: P = pequeno, M = médio.

| ID | Tipo | Problema hoje | Onde | Correção proposta | Esforço |
|---|---|---|---|---|---|
| Q1 | bug | Datas "só dia" aparecem **um dia antes** (fuso) | `lib/equipamentos.js::enriquecerEquipamento`, `TicketsPage.js::formatDate` (quando usado em `proxima_manutencao`) | Usar `lib/datas.js::formatarData` em todo o front (o item 1 já cria o helper) | P |
| Q2 | bug | `PATCH id_setor=null` → 500 | `equipamentos/serializers.py::validate_id_setor` | 400 "O setor é obrigatório." (já incluído no item 2) | P |
| Q3 | bug | Detalhe IoT do equipamento mostra referências fixas que não batem com o mock ("Nominal: 1450 RPM", "Máx: 6.0 bar", com pressão simulada de 2 a 15) e "— RPM" quando não há leitura | `InventoryPage.js` (modal de detalhe) | Remover as referências inventadas (ou derivá-las dos limites reais de anomalia) e exibir "—" sem unidade quando não houver valor | P |
| Q4 | bug | Beat de preventivas roda a cada minuto | `config/celery.py` | `crontab(minute=0)` e comentário correto | P |
| Q5 | bug | Erro ao carregar setores no Inventário é engolido (o comentário fala de "mockados" que não existem). Depois de cadastrar um tipo, a página recarrega todos os equipamentos + IoT | `InventoryPage.js::carregarSetores`, `handleCadastrarTipo` | Mostrar o erro e recarregar só os tipos | P |
| Q6 | segurança | Qualquer usuário autenticado cria e edita setores, tipos e equipamentos pela API (a UI esconde os botões) | `empresas/views.py`, `equipamentos/views.py` | Toda escrita só para admin, atualizando os 2 testes da armadilha 3.4 para usar admin e adicionando testes de 403 | M |
| Q7 | UX | O modal não fecha com Esc, não foca o primeiro campo e fecha ao clicar fora mesmo enquanto salva | `ui/index.js::Modal` | Esc fecha; foco inicial; prop opcional `bloquearFechamento` | P |
| Q8 | UX | `confirm()` e `alert()` nativos e nenhum feedback de sucesso | `InventoryPage.js`, `UsersPage.js`, `TicketsPage.js` ("Desativar OS Abertas") | Reaproveitar o modal de confirmação do item 2 e criar um toast leve em `ui/index.js` | M |
| Q9 | QOL | Inventário sem filtro por setor e por tipo, sem ordenação e sem estado vazio (aparece só o cabeçalho da tabela) | `InventoryPage.js` | Filtros por setor e tipo, ordenação por coluna, "Nenhum equipamento" com botão de cadastro para o admin; busca também por setor e tipo | P–M |
| Q10 | QOL | Não dá para **editar** equipamento, e o cadastro não tem fabricante, modelo nem data de instalação (o model e a API já aceitam) | `InventoryPage.js` | Modal de edição (PATCH) e campos opcionais no cadastro. Se permitir trocar o setor, sincronizar o `PlanoManutencao.id_setor` no backend (ver 6.3) | M |
| Q11 | QOL | Chamados sem busca nem filtro; os cards de resumo não são clicáveis | `TicketsPage.js` | Busca por título, TAG e solicitante; filtro por status e prioridade; cards de resumo funcionando como filtro | P–M |
| Q12 | UX | Textos da UI sem acento ("Nao foi possivel…", "Visualizacao interativa…", "Numero vermelho…") | `OtherPages.js`, `TicketsPage.js` | Padronizar com acento | P |
| Q13 | performance | O polling de notificações a cada **3 s** gera muita requisição | `DashboardShell.js` | 20–30 s (a página já atualiza no foco, ao voltar para a aba e ao abrir o painel) | P |
| Q14 | limpeza | `console.log` no login expõe o perfil e os dados do erro; mocks sem uso em `lib/constants.js` (`equipmentData`, `ticketData`, `mockNotifications`, `adminMenu`, `techMenu`) | `app/login/page.js`, `lib/constants.js` | Remover (confirme com grep que nada usa) | P |

Se durante a implementação encontrar outro problema simples de UX, **anote e proponha**. Não implemente fora do cardápio aprovado.

---

## 8. Fases

Ao final de cada fase:
- rode `cd backend && venv\Scripts\python.exe manage.py test` e `makemigrations --check`;
- rode `cd frontend && npx eslint <arquivos tocados>`;
- quando houver mudança de front, rode `npm run build`;
- reporte os resultados.

| Fase | Entrega |
|---|---|
| **0. Reconhecimento (sem editar)** | Ler os arquivos citados, rodar `migrate` e a suíte (confirmar 275), confirmar as armadilhas da seção 3. Responder com: plano por item (arquivos, endpoints, componentes e um esboço ASCII do modal de agendar e do modal de exclusão), as decisões da seção 9 com recomendação e o cardápio da seção 7 com a sua opinião. **Pare e espere.** |
| 1. Backend | Item 1 (permissão, validação, filtro, notificação) + item 2 (services, `dependencias`, destroy protegido, auditoria, correção do `id_setor` nulo) + os Q de backend escolhidos, todos com testes |
| 2. Frontend do item 1 | Ícones, helper de datas, lib de planos, modal de agendar, coluna "Próx. manutenção", seção no detalhe, correção do N+1 |
| 3. Frontend do item 2 | `userType` no mapa, `ConfirmarExclusaoModal`, ações no painel e no detalhe do Inventário |
| 4. Itens Q do frontend escolhidos | Conforme o cardápio aprovado |
| 5. Fechamento | README (endpoints novos e regras de exclusão) e relatório final |

---

## 9. Decisões para o usuário (recomendação entre parênteses)

1. Quem agenda, edita e exclui planos? (Só admin.)
2. Equipamento com histórico de OS: bloquear a exclusão e oferecer "Desativar", ou permitir excluir com confirmação forte? (Bloquear e oferecer "Desativar". Excluir hoje faz as OS sumirem das listas.)
3. Ao excluir um setor com equipamentos: só bloquear, ou oferecer "Mover equipamentos para…"? (Só bloquear agora; mover pode entrar com o Q10.)
4. Permitir tipo `preditiva` no modal de agendar, ou só `preventiva`? (Só preventiva, como foi pedido.)
5. Notificar os admins quando uma OS de IoT for gerada, além da preventiva? (Não por enquanto, porque a task roda a cada 5 min e pode virar spam. Só preventiva.)
6. Quais itens do cardápio Q1–Q14 entram? (Recomendado no mínimo os bugs Q1–Q5, mais Q7 e Q12, que são baratos.)

---

## 10. Definição de pronto
- Todos os testes passam (os 275 antigos + os novos), cobrindo as regras de permissão, validação, bloqueio de exclusão, contagens, auditoria e notificação.
- `makemigrations --check` limpo, ESLint limpo nos arquivos tocados e `npm run build` sem erro.
- Os fluxos existentes não regridem: cadastrar setor, tipo e equipamento; abrir, aprovar e concluir OS; triagem por IA; notificações; IoT mock.
- **Relatório final**:
  - o que foi feito por item;
  - arquivos alterados;
  - decisões tomadas;
  - como testar manualmente, passo a passo: `seed_mock_data --with-os`, login como admin e como operador, agendar, ver a coluna, excluir pelo mapa nos casos bloqueado e permitido, e worker + beat para ver a OS gerada;
  - o que **não** foi verificado e as limitações.

## 11. Fora de escopo
Previsão de risco (IA/ML) e qualquer mudança de layout do mapa além do painel lateral; conjuntos de equipamentos, agendamento pontual e agenda/calendário (ficam para o meta prompt futuro); mudanças de autenticação; TypeScript; bibliotecas de UI; refatorações sem relação com estes itens.
