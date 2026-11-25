# Meta prompt — Design patterns do backend: auditoria, ajustes e roteiro da apresentação (até 10 min)

> **Atualização (23/11/2026)**: o professor exige **só padrões do GoF**, e o **Service Layer foi substituído por Facade (GoF, estrutural)**.
> - **Mesmas peças, outro papel**: `OrdemServicoService` e `NotificacaoService` são as fachadas. O que a seção 4.1 diz sobre transação e regra fora da view continua valendo para a fachada.
> - **SOLID**: a apresentação também cita os princípios que cada padrão cumpre:
>   - Facade: S;
>   - Observer: O e S;
>   - Strategy: O, L e D.
> - **Já executado** na branch `refactor/design-patterns`: P0-1, P0-2, P0-3 e P1-3, com os testes em `backend/ordens_servico/test_padroes.py`.
> - **Roteiro final**: `docs/apresentacao/roteiro-design-patterns-backend.md`.

> **Como usar**: no Claude Code, na raiz do repositório, peça *"Execute o meta prompt `docs/prompts/meta-prompt-design-patterns-apresentacao.md` a partir da Fase 0"*. Para acelerar, responda já as decisões da seção 11 (ex.: "D1 sim, D2 P0+P1, D3 não...").
>
> **Verificado em 23/11/2026** na branch `feat/pre-diagnostico-ia` (commit `be1c631`, árvore limpa): leitura completa do backend, suíte de testes rodada e os três desvios P0 reproduzidos num banco de teste em memória. Os números de linha valem para esse commit; confira de novo na Fase 0.

## 0. Missão

Preparar o backend do **squad-ceny-pi** (Django + DRF) para uma apresentação de **até 10 minutos** sobre os **três design patterns mais importantes que o código aplica**: **Service Layer**, **Observer** e **Strategy** (escolha justificada na seção 3). Quem avalia pode conhecer GoF e Fowler, então cada padrão precisa estar **completo e defensável**: todos os papéis presentes, nenhum caminho que fure o padrão e testes que provem as garantias.

Três entregáveis, nesta ordem:

1. **Auditoria (sem editar nada)**: para cada padrão, a tabela papel → arquivo:linha e o checklist da seção 4 marcado (✔/✘) com evidência.
2. **Ajustes cirúrgicos (só os aprovados)**: corrigir os desvios da seção 5. Cada correção vem com um teste que **falha antes e passa depois**, sem mudar o contrato da API e sem migration.
3. **Roteiro da apresentação** (seções 9 e 10), com:
   - fala cronometrada e texto de cada slide;
   - trechos de código com arquivo:linha **do código final**;
   - diagramas;
   - banco de perguntas e cortes de emergência.

**A Fase 0 é só leitura e plano. Não edite nenhum arquivo até o usuário aprovar o plano e responder às decisões da seção 11.**

---

## 1. Papel e postura

- Atue como **engenheiro backend sênior (Django 6/DRF)**, **professor de padrões de projeto** (GoF e Fowler/PoEAA) e **coach de apresentação técnica**.
- **Rigor conceitual**:
  - Só chame algo de padrão quando **todos os participantes** existirem no código e você puder apontar cada um por arquivo:linha.
  - Separe o **padrão que o framework implementa** (middleware, hooks do DRF, `Signal` do Django) do **padrão que o time aplicou**, que é o que vale na apresentação. Usar um mecanismo do framework para aplicar um padrão conta, desde que os papéis sejam do time.
  - **Não force padrão.** Se um trecho não se encaixa, não renomeie a realidade: corrija (seção 5) ou assuma a limitação em uma frase na fala.
  - Na dúvida conceitual, apoie-se nas fontes:
    - GoF, *Design Patterns* (1994);
    - Fowler, *Patterns of Enterprise Application Architecture* (2002);
    - Ramalho, *Python Fluente*, capítulo "Padrões de projeto com funções de primeira classe".
- **Mudanças mínimas**: nada de refatoração cosmética fora da seção 5. Preserve nomes públicos, rotas, payloads, códigos HTTP, mensagens e os `codigo` de erro.
- **Teste primeiro**: para cada desvio, escreva o teste, mostre-o falhando no código atual, corrija e mostre-o passando.
- **Fidelidade no relato**: mostre a saída dos testes. Se algo não foi verificado, diga.
- Se achar uma solução melhor que a sugerida aqui, proponha com justificativa **antes** de implementar.

---

## 2. Contexto verificado do projeto

### Stack (o `requirements.txt` vale mais que o README)
- Python **3.12.3** (venv em `backend/venv`), **Django 6.0.4**, DRF 3.17.1, SimpleJWT 5.5.1, django-cors-headers.
- **Celery 5.6.3** + django-celery-beat 2.9 + Redis (Memurai no Windows). `config/celery.py` agenda duas tasks:
  - `verificar_manutencoes_preventivas`, de hora em hora;
  - `processar_anomalias_iot`, a cada 5 min.
- **google-genai 2.28** (Gemini), usado na triagem de OS por texto livre e no pré-diagnóstico de causa.
- SQLite por padrão; PostgreSQL via `DB_ENGINE`.
- **Sem `ATOMIC_REQUESTS`**: fora de `transaction.atomic`, cada `save()` é confirmado sozinho.
- Sem linter configurado (existe só um `.ruff_cache`). Não introduza ferramenta nova.

### Base obrigatória: branch `feat/pre-diagnostico-ia`
- Está **21 commits à frente da `main`** e ainda não foi mergeada.
- **O Strategy (seção 4.3) só existe nela.** Na `main`, `triagem_ia.py` chama `_validar_resposta` direto e `diagnostico_ia.py` não existe, então não há segunda estratégia.

### Arquitetura em camadas
```
HTTP ──► urls ──► ViewSet (fino: permissão, entrada, código HTTP)
                    │         └──► Serializer (validação e formato)
                    ▼
Celery beat ──► tasks.py ────┐
CLI ──► management command ──┼──► Services (regra de negócio, transação)
                             │       ├──► NotificacaoService (avisos)
                             │       └──► consultar_gemini (IA externa)
                             ▼
                    Models + QuerySets (dados, visibilidade multiempresa)
                             │ post_save / post_delete
                             ▼
                    notificacoes/signals.py ──► LogAuditoria
```
- Apps:
  - `usuarios`: Usuario, UsuarioSetor e JWT com claims;
  - `empresas`: Empresa e Setor;
  - `equipamentos`: Equipamento, com TAG automática;
  - `ordens_servico`: OS, TriagemIA, DiagnosticoCausa, triagem e pré-diagnóstico por IA;
  - `manutencao`: planos, execuções, anomalias IoT e tasks;
  - `notificacoes`: Notificacao, LogAuditoria e signals.
- O PR #12 (`refactor/backend-patterns`, set/2026) já centralizou as notificações no `NotificacaoService`, levou a visibilidade para `QuerySet.visiveis_para` e afinou as views. Este trabalho continua de onde ele parou.

### Testes
- Django `TestCase` com `config/testutils.py` (`BaseTestCase`, `Cenario`, `criar_*`, `vincular`). O Gemini é sempre mockado.
- **Baseline: 426 testes OK em ~3,5 s**: `cd backend && venv\Scripts\python.exe manage.py test`.

---

## 3. Os três padrões escolhidos (e por quê)

| # | Padrão | Catálogo | Núcleo no código | Por que está entre os mais importantes |
|---|---|---|---|---|
| 1 | **Service Layer** | Fowler (PoEAA), arquitetural | `ordens_servico/services.py`, `manutencao/services.py`, `notificacoes/services.py`, `equipamentos/services.py` | É a espinha dorsal: toda regra de negócio passa por ele, e **a mesma regra atende API, Celery e linha de comando**. |
| 2 | **Observer** | GoF, comportamental | `notificacoes/signals.py` + `notificacoes/apps.py` | Faz a auditoria transversal sem acoplar as apps de domínio ao log. |
| 3 | **Strategy** | GoF, comportamental | `ordens_servico/triagem_ia.py::consultar_gemini` + os dois validadores | As duas features de IA (o diferencial do produto) compartilham a chamada robusta ao Gemini e **trocam só a estratégia de validação**. |

**Outros padrões presentes** (um slide rápido, uma frase cada, sem aprofundar):
- **Facade**: `NotificacaoService` dá uma interface única para criar avisos (destinatários, montagem, `bulk_create`). Fowler descreve que a Service Layer pode ser implementada como um conjunto de fachadas finas sobre o domínio.
- **Query Object / Specification** (via QuerySet customizado): `visiveis_para(usuario)` concentra a regra de visibilidade multiempresa em `equipamentos/models.py:26`, `ordens_servico/models.py:10` e `manutencao/models.py:8`.
- **Template Method** (do DRF, usado pelo time):
  - os hooks `get_queryset`, `perform_create`, `get_permissions` e `get_serializer_class`;
  - `get_token` (`usuarios/token.py:19`), que chama `super()` e acrescenta claims.
- **Command** (do Celery): tasks enfileiradas e agendadas pelo beat. O comando `gerar_preventivas` é um segundo invocador da mesma operação.
- **Retry com backoff exponencial** (padrão de resiliência), dentro de `consultar_gemini`.

**Não apresente como exemplo:**
- **`usuarios/backends.py::EmailBackend` como Strategy de autenticação.** É código morto, por três motivos:
  - Com `USERNAME_FIELD = "email"`, o `ModelBackend` (primeiro de `AUTHENTICATION_BACKENDS`) já autentica por e-mail.
  - O SimpleJWT chama `authenticate(email=..., password=...)`, então o `EmailBackend` recebe `username=None` e nunca autentica.
  - Verificado: o usuário autenticado volta com `backend = ModelBackend`, e `EmailBackend().authenticate(None, email=..., password=...)` devolve `None`.
- **Singleton** (app do Celery, settings): é do framework, não decisão do time.
- **"Factory"** para `criar_os_preventiva`, `criar_os_preditiva` ou `NotificacaoService._nova`: são funções de criação, não o Factory Method do GoF. Se citar, chame de "função fábrica".
- **Repository "puro"**: o ORM do Django é Active Record. Prefira "Query Object via QuerySet customizado".

---

## 4. O que é "perfeitamente aplicado" (checklists)

### 4.1 Service Layer
> Fowler: *"Define a fronteira da aplicação com uma camada de serviços que estabelece um conjunto de operações disponíveis e coordena a resposta da aplicação em cada operação"*. Ela encapsula a lógica de negócio, **controlando as transações**.

| Papel | No código |
|---|---|
| Operações da aplicação (`OrdemServicoService`) | `aprovar` (`ordens_servico/services.py:33`), `iniciar` (:50), `rejeitar` (:62), `reabrir` (:72), `concluir` (:106), `desativar_abertas` (:157) |
| Operações da aplicação (`manutencao/services.py`) | `gerar_preventivas_vencidas` (:185), `avisar_planos_vencendo` (:210), `executar_agora` (:234), `pular_proxima` (:246), `pausar` (:255), `retomar` (:263), `criar_os_preditiva` (:279) |
| Operações da aplicação (outros services) | `NotificacaoService` (`notificacoes/services.py:7`), `criar_com_tag_automatica` (`equipamentos/services.py:43`) |
| Clientes da camada | `OrdemServicoViewSet` (`ordens_servico/views.py:61`), `PlanoManutencaoViewSet` (`manutencao/views.py:29`), tasks do Celery (`manutencao/tasks.py:11` e `:24`), comando `gerar_preventivas` (`manutencao/management/commands/gerar_preventivas.py:14`) |
| Domínio e dados | models + QuerySets |

Critérios:
- **S1. A entrada não decide regra.** View, task e comando só traduzem a entrada (HTTP, agendamento, CLI) numa chamada de service e o resultado numa saída. Exceção aceita: persistência simples via `serializer.save()`, que é o padrão do DRF.
- **S2. O service não conhece HTTP.** Não recebe `request` nem devolve `Response`. Violação de regra vira exceção (`ValueError`), que a view traduz em 400.
- **S3. Caso de uso com mais de uma escrita roda numa transação só** (`transaction.atomic`), aberta por quem orquestra as escritas. Normalmente é o service; a view só abre a transação quando compõe `serializer.save()` + service.
- **S4. Uma regra, um lugar.** A mesma operação serve todas as entradas, sem duplicação.

Situação atual:
- **S2 ✔**.
- **S4 ✔** no essencial: `gerar_preventivas_vencidas` e `avisar_planos_vencendo` servem tanto a task quanto o comando. A duplicação em `pode_gerar` fica como P2-2.
- **S1 ✘ e S3 ✘** (ver P0-1, P1-1 e P1-2).

### 4.2 Observer
> GoF: *"Define uma dependência um-para-muitos entre objetos, de modo que, quando um objeto muda de estado, todos os seus dependentes são notificados e atualizados automaticamente."*

| Papel GoF | No código |
|---|---|
| Subject | `OrdemServico` e `PlanoManutencao`. O Django emite `post_save`/`post_delete` a cada `save()`/`delete()`. |
| Inscrição (attach) | `@receiver(..., sender=...)` em `notificacoes/signals.py:30-49`, carregado por `NotificacoesConfig.ready()` (`notificacoes/apps.py:7-8`) |
| ConcreteObserver | `log_ordem_servico`, `log_ordem_servico_delete`, `log_plano_manutencao`, `log_plano_manutencao_delete` |
| Efeito | `LogAuditoria` (`notificacoes/models.py:47`) |

Critérios:
- **O1. O sujeito não conhece o observador**: `ordens_servico` e `manutencao` não importam `notificacoes.signals`. ✔
- **O2. A inscrição é única e explícita**, feita no `ready()`. ✔ (endurecimento: `dispatch_uid`, em P1-4)
- **O3. Toda mudança de estado do sujeito chega ao observador.** Nenhum código de produção pode alterar `OrdemServico` ou `PlanoManutencao` com `QuerySet.update()`, `bulk_create()` ou `bulk_update()`, porque eles **não emitem signals**. **✘** (ver P0-2)
- **O4. O observador só registra.** Não altera a regra nem o sujeito, e roda na mesma transação: se a operação desfaz, o log desfaz junto. ✔
- **O5. Há testes cobrindo**: `notificacoes/tests.py:140` (`SignalsAuditoriaTests`). ✔

**Decisão de design a defender**: as notificações de negócio **não** usam Observer.
- Elas dependem de contexto que o signal não carrega: quem aprovou, qual técnico, qual texto.
- Precisam ser legíveis no fluxo, por isso são chamadas explícitas do service ao `NotificacaoService`.
- Regra prática: **Observer para preocupação transversal (auditoria); chamada explícita para regra de negócio.**

**Limitação conhecida** (não é desvio do padrão): `LogAuditoria.id_usuario` fica nulo, porque o receiver não recebe a request (`notificacoes/signals.py:20-21`). Ver D5.

### 4.3 Strategy
> GoF: *"Define uma família de algoritmos, encapsula cada um deles e os torna intercambiáveis. O Strategy permite que o algoritmo varie independentemente dos clientes que o utilizam."*

| Papel GoF | No código |
|---|---|
| Context | `consultar_gemini(instrucao, conteudo, schema, validar, contexto, rotulo)` (`ordens_servico/triagem_ia.py:361`). O algoritmo é fixo: cria o cliente, pede saída estruturada, aplica timeout, faz retry com backoff exponencial e traduz os erros. |
| Strategy (contrato) | `validar(dados: dict) -> dict`. Recebe o JSON da IA e devolve os campos saneados, ou levanta `RespostaIAInvalida`. O Context trata essa exceção como falha transitória e **retenta** (`triagem_ia.py:414`). Assim, a estratégia participa do algoritmo sem conhecê-lo. |
| ConcreteStrategy A | `_validar_resposta` (`triagem_ia.py:479`) |
| ConcreteStrategy B | `validar_resposta` (`diagnostico_ia.py:347`) |
| Client (escolhe a estratégia) | `_consultar_gemini` (`triagem_ia.py:344`) e `gerar_diagnostico` (`diagnostico_ia.py:177`, chamada na linha 205) |

Nota para a fala: em Python, funções são objetos de primeira classe, então uma estratégia pode ser uma função em vez de uma classe com um único método. É a forma idiomática descrita em *Python Fluente*. O que define o padrão é a intenção e os papéis, não o uso de classes.

Critérios:
- **E1. O contrato é explícito**: um tipo nomeado e uma docstring dizendo o que entra, o que sai e como sinalizar falha. **✘** (hoje `validar` não tem anotação)
- **E2. Há pelo menos duas estratégias concretas intercambiáveis.** ✔
- **E3. O Context não conhece as estratégias concretas.** ✔
- **E4. O cliente escolhe a estratégia.** ✔
- **E5. Coesão**: o Context fica num módulo neutro, não dentro de um dos clientes. **✘ parcial**: `consultar_gemini` e a hierarquia de erros moram em `triagem_ia.py`, e o `diagnostico_ia.py` importa da triagem (linha 27). Opcional (P2-1).

---

## 5. Desvios confirmados e correções

**P0** = obrigatório (sem ele o padrão não está perfeito, ou há bug real) · **P1** = recomendado · **P2** = opcional.

### P0-1 — Transação nos casos de uso de OS e escrita entre empresas no `resolver_tecnico` (S3, bug real)

**Evidência**
- `OrdemServicoService.aprovar` (:33-47), `rejeitar` (:62-69), `reabrir` (:72-95) e `concluir` (:106-154) fazem várias escritas sem `transaction.atomic`.
  - O `concluir` grava a OS, o diagnóstico, o equipamento, o plano, o status do equipamento e a notificação.
  - Uma falha no meio deixa estado parcial, por exemplo uma OS concluída com o equipamento preso em `em_manutencao`.
- `ordens_servico/resolvers.py:17-20` promove o `perfil_no_setor` e **grava antes** de checar a empresa (:24-28). **Reproduzido** num banco de teste:
  - um admin da empresa A aprova uma OS com o `tecnico_id` de um vínculo da empresa B (usuário com perfil técnico, vínculo `operador`);
  - a resposta é 400, *"O tecnico deve pertencer a mesma empresa do admin."*;
  - mesmo assim, **o vínculo da empresa B passa a ser `tecnico`**. É uma escrita em outra empresa num caminho de erro.

**Correção**
1. Em `resolver_tecnico`, validar a empresa **antes** de qualquer escrita. Mantenha as mensagens e a precedência já fixadas em `ordens_servico/tests.py:458, 468, 487`.
2. Pôr `@transaction.atomic` em `aprovar`, `rejeitar`, `reabrir` e `concluir`, com o `@staticmethod` por fora.

**Testes novos** (em `ordens_servico/tests.py`)
- Vínculo de outra empresa, de usuário técnico com vínculo `operador`: resposta 400, e o vínculo continua `operador`.
- `concluir` com falha simulada no último passo, chamando o service direto:
  - simule com `patch.object(NotificacaoService, "notificar_conclusao", side_effect=RuntimeError)`;
  - o resultado esperado é `RuntimeError`;
  - depois de `refresh_from_db()`, a OS continua `em_andamento`, e equipamento, plano e diagnóstico ficam inalterados.
- O mesmo para `aprovar`, com falha em `notificar_aprovacao`: a OS continua `aberta` e o equipamento não vira `em_manutencao`.

### P0-2 — Cancelamento em lote sem auditoria (O3)

**Evidência**: `OrdemServicoService.desativar_abertas` (:157-165) usa `QuerySet.update()`, que não emite `post_save`. **Reproduzido**: 1 OS cancelada gerou **0** registros de `LogAuditoria`, enquanto um `save()` comum gera 1.

**Correção**
- **Recomendada (D4-a)**: percorrer as OS canceláveis e salvar cada uma com `save(update_fields=["status"])` dentro de `transaction.atomic`, devolvendo a quantidade.
  - Mantenha a exclusão da OS preditiva de IoT sem solicitante.
  - Mantenha o payload `{"status": "ok", "ordens_desativadas": n}`.
- **Alternativa (D4-b)**: manter o `UPDATE` único e emitir um signal próprio com os ids (`ordens_servico/signals.py`: `os_canceladas_em_lote = Signal()`), recebido em `notificacoes/signals.py`. Mostra que o time sabe criar eventos próprios, mas dá mais código. Só faça se o usuário escolher.

**Testes novos** (em `DesativarAbertasTests`, `ordens_servico/tests.py:902-941`)
- N OS canceladas geram N logs *"Atualização de OS: <título>"*.
- A OS de IoT preservada não gera log.
- Os testes atuais da classe continuam passando sem mudança.

**Varredura obrigatória**: procure `.update(`, `bulk_create(` e `bulk_update(` em código de produção que altere `OrdemServico` ou `PlanoManutencao`.
- Hoje só existe este caso.
- `empresas/views.py:57` atualiza `Equipamento`, que não é observado.
- O `seed_mock_data` é seed e pode ficar como está.

### P0-3 — Contrato explícito da estratégia (E1)

**Correção**: declare o contrato junto do Context e documente os papéis. Por exemplo:
```python
# Strategy: recebe o JSON devolvido pela IA e devolve os campos saneados.
# Levanta RespostaIAInvalida quando a resposta nao serve (o Context retenta).
ValidadorResposta = Callable[[dict], dict]
```
- Se o time preferir algo com cara de "interface", use um `typing.Protocol` com `__call__`.
- Anote `validar: ValidadorResposta` em `consultar_gemini`.
- Na docstring de `consultar_gemini`, diga que ele é o Context e descreva o contrato.
- Dê às duas estratégias concretas a mesma assinatura.

**Teste novo** (prova de intercambialidade, que também serve de slide)
- Uma estratégia de teste qualquer (ex.: devolve `{"ok": True}`) é aplicada pelo Context sem mudar nada nele.
- Outra estratégia levanta `RespostaIAInvalida` na 1ª chamada e passa na 2ª. Isso prova que o Context retenta por causa dela.
- Reaproveite os mocks que já existem (`ordens_servico.triagem_ia.genai.Client` e `time.sleep`) e o `override_settings` da chave.

### P1-1 — Regra de negócio na view do setor (S1)
- **Evidência**: `empresas/views.py:51-59` (`SetorViewSet.perform_update`) decide, na view, que um setor inativo deixa os equipamentos inativos.
- **Correção**:
  - crie `empresas/services.py` com essa regra (ex.: `desativar_equipamentos_do_setor(setor)`);
  - a view fica só compondo `serializer.save()` + service, dentro da transação (ver S3).
- **Testes**: os testes atuais de desativação em `empresas/tests.py` continuam passando sem mudança. Acrescente um teste unitário da nova função.

### P1-2 — Transação nos casos de uso do sistema (S3)
- **`criar_os_preditiva`** (`manutencao/services.py:279-303`) cria a OS e, depois, grava o vínculo na anomalia.
  - **Correção**: `@transaction.atomic`, e `anomalia.save(update_fields=["os_gerada"])` no lugar do `anomalia.save()`.
- **`avisar_planos_vencendo`** (:210-228) cria as notificações de cada plano e, depois, grava `aviso_enviado_para`. Se o segundo passo falhar, a próxima execução duplica o aviso.
  - **Correção**: `with transaction.atomic():` **por plano**, para que um plano com erro não desfaça os outros.
- **Não mexa** em `criar_os_preventiva`: ela já roda dentro de `_processar_plano`, que é atômico.
- **Testes**: uma falha simulada no segundo passo não deixa nada gravado.

### P1-3 — Documentar o papel de cada peça no padrão (uma linha, sem poluir)
- **Service Layer**: `ordens_servico/services.py`, `manutencao/services.py` e `notificacoes/services.py` (este também é a fachada dos avisos).
- **Observer**: `notificacoes/signals.py`. Corrija também a frase desatualizada *"Para ativar, chame ready()..."*: a inscrição já está ativa.
- **Strategy**: `consultar_gemini` (Context) e os dois validadores (estratégias concretas).
- Não renomeie nada por causa disso.

### P1-4 — Endurecer a inscrição dos observadores (O2)
- Acrescente `dispatch_uid` em cada `@receiver`.
- Não precisa de teste novo: `SignalsAuditoriaTests` já cobre.

### P2-1 — Context do Strategy num módulo neutro (E5), só se D3 = sim
- Crie `ordens_servico/ia_gemini.py` com `consultar_gemini`, `ValidadorResposta`, `_ler_json`, `_config_de_raciocinio`, as constantes de backoff e a hierarquia de erros.
  - Mantenha os nomes e os `codigo` dos erros.
  - Decida e justifique onde fica o `limpar_texto`, que é usado pelos serializers, pela triagem e pelo diagnóstico.
- Atualize os imports em `views.py`, `serializers.py`, `diagnostico_ia.py`, `triagem_ia.py` e nos testes.
- **Atualize os alvos de `patch`** em `test_triagem_ia.py:91-92`, `test_diagnostico_ia.py:72-73` e na docstring de `test_diagnostico_ia.py:3`.
- Não deixe shims de reexportação.
- Critério de aceite: a suíte inteira passa sem mudar nenhum assert.

### P2-2 — Uma regra de acesso, um lugar (S4)
- `diagnostico_ia.pode_gerar` (:163-171) repete `OrdemServicoService.usuario_e_admin` e `tecnico_atribuido`.
- Cuidado: `services.py` importa `diagnostico_ia` (linha 9), então importar o service de volta cria import circular.
- Se fizer, extraia as duas checagens para um módulo neutro (ex.: `ordens_servico/acesso.py`) e faça os dois usarem.

### P2-3 — Nomes das estratégias
- Hoje uma estratégia é privada (`_validar_resposta`, na triagem) e a outra é pública (`validar_resposta`, no diagnóstico).
- Se fizer, padronize (ex.: `validar_resposta_triagem` e `validar_resposta_diagnostico`) e atualize os testes que importam esses nomes.

---

## 6. Armadilhas confirmadas

1. **Ordem dos decoradores**: com `@staticmethod` e `@transaction.atomic`, o `@staticmethod` fica por fora (em cima).
2. **Testes de rollback**:
   - O `TestCase` já roda cada teste numa transação, então o `atomic` interno vira savepoint, e o rollback dele pode ser verificado no próprio teste.
   - Chame o service direto com `assertRaises` e depois use `refresh_from_db()`, porque o objeto em memória continua alterado.
   - Pela API, o test client relança a exceção não tratada.
3. **Signals em operações de lote**: `QuerySet.update()`, `bulk_create()` e `bulk_update()` **não emitem** signals. Já o `QuerySet.delete()` emite `post_delete` para cada objeto.
4. **Log único no `rejeitar`**: `notificacoes/tests.py:194` (`test_fluxo_da_api_gera_log_de_atualizacao`) exige **exatamente 1** log ao rejeitar pela API. Não acrescente `save()` extra nesse fluxo.
5. **IoT não notifica de propósito**: a OS preditiva de IoT não notifica por decisão de produto (`docs/manutencao_preventiva.md:162`, teste em `manutencao/tests.py:484`). Não "corrija".
6. **Alvos do mock do Gemini**:
   - Os testes fazem patch de `ordens_servico.triagem_ia.genai.Client` e de `ordens_servico.triagem_ia.time.sleep`.
   - O patch age no módulo global (`google.genai` e `time`), então funciona enquanto `triagem_ia` importar `genai` e `time`.
   - Se fizer o P2-1, atualize esses alvos.
7. **Import circular**: `ordens_servico/services.py` importa `diagnostico_ia` (linha 9), então `diagnostico_ia` não pode importar `services` no topo do módulo.
8. **Mensagens do `resolver_tecnico`**: as mensagens e a precedência estão fixadas nos testes (`ordens_servico/tests.py:458, 468, 487`).
9. **`desativar_abertas`**: precisa continuar preservando a OS preditiva de IoT e devolvendo a contagem (`DesativarAbertasTests`).
10. **SQLite ignora `select_for_update()`**: não dependa dele em testes de concorrência.
11. **Número de consultas da triagem**: há `assertNumQueries(1)` em `test_triagem_ia.py:807` e `:812`. Não acrescente consultas nesses caminhos.
12. **Não ligue `ATOMIC_REQUESTS` para "resolver" o S3.**
    - Mudaria o comportamento de todas as views.
    - Não cobriria Celery nem comandos.
    - Esconderia a fronteira que a apresentação quer mostrar no service.
13. **`EmailBackend`**: é redundante (seção 3). Não use como exemplo e não remova sem decisão (D6).

---

## 7. Convenções obrigatórias

- **Idioma**:
  - Nomes e docstrings em pt-BR, curtas, no estilo do arquivo (as docstrings internas costumam vir sem acento).
  - Mensagens para o usuário com acento, salvo onde o código já fixou a mensagem sem acento.
- **Camadas e erros**: a regra fica no service e as views ficam finas.
  - `ValueError` vira 400 `{"detail": ...}`.
  - Para 403, use as constantes `MSG_...`.
  - Erro da IA vira `{"detail", "codigo"}`.
- **Testes**: use `BaseTestCase` e `Cenario`, com pelo menos um teste por desvio corrigido.
- **Sem migrations**: nenhuma correção mexe em model. Se aparecer a necessidade, pare e pergunte.
- **Git**:
  - Crie uma branch nova a partir de `feat/pre-diagnostico-ia` (D7).
  - Faça commits pequenos, um por desvio, no estilo do repo: `fix(ordens_servico): ...`, `refactor(notificacoes): ...`, `test: ...`, `docs: ...`.
  - **Sem `Co-Authored-By` nos commits e sem rodapé "Generated with Claude Code" nos PRs** (preferência do usuário).
  - Commit, push e PR só quando o usuário pedir.

---

## 8. Fases

**Fase 0 — Leitura e plano (sem editar)**
1. Confirme a branch, o commit e a árvore limpa. Rode a suíte e registre o baseline (esperado: 426 OK).
2. Releia os arquivos da seção 4 e refaça a tabela papel → arquivo:linha de cada padrão, com os números de linha atuais.
3. Reproduza os desvios P0, com testes que falham ou com um script num banco de teste em memória (`connection.creation.create_test_db()`). **Nunca use o `db.sqlite3` para isso.**
4. Apresente o plano por fase, os arquivos que vai tocar, os riscos e as decisões da seção 11, com a recomendação.

Saída: aprovação do usuário.

**Fase 1 — Service Layer**: P0-1; depois P1-1 e P1-2, se aprovados.

**Fase 2 — Observer**: P0-2; depois P1-4.

**Fase 3 — Strategy**: P0-3; depois P2-1 e P2-3, se aprovados.

**Fase 4 — Docstrings e verificação final**
- P1-3.
- Suíte completa verde (426 + os novos) e `manage.py check` sem problemas.
- Revise o `git diff --stat` e confirme que nenhum contrato de API mudou.
- Refaça os checklists da seção 4: tudo ✔, ou o ✘ que sobrar justificado por decisão do usuário.

**Fase 5 — Roteiro** (seções 9 e 10)
- Escreva usando os arquivo:linha **finais** e confira cada referência abrindo o arquivo.
- Os trechos de código nos slides devem ser cópias fiéis, só encurtadas (marque as omissões com `...`).

**Fase 6 — Ensaio**
- Conte as palavras da fala e estime o tempo (seção 9).
- Corte o que passar e liste os cortes de emergência.

Ao fim de cada fase, rode a suíte inteira e mostre o resultado antes de seguir.

---

## 9. Requisitos da apresentação

- **Público** (confirmar em D9): banca acadêmica e turma de tecnologia. Conhecem orientação a objetos e padrões em teoria, mas não necessariamente Django.
- **Tempo**:
  - limite de **10:00**, com alvo de **9:00 a 9:30**;
  - com código na tela, conte ~120 a 130 palavras por minuto, o que dá **~1.100 a 1.200 palavras de fala**.
- **Fio condutor**: acompanhe **uma OS**, do relato em texto livre até a conclusão, e mostre cada padrão no ponto em que ele age:
  - Strategy na triagem e no pré-diagnóstico;
  - Service Layer na aprovação e na conclusão;
  - Observer em cada mudança de estado.
- **Receita por padrão** (repetir a mesma sequência facilita a vida de quem assiste):
  1. Problema concreto no projeto, em uma frase.
  2. O padrão em uma frase (definição canônica), com os seus papéis.
  3. Onde está (arquivo:linha), com **um trecho de no máximo 12 linhas**: só o essencial, sem imports.
  4. Diagrama com os papéis do padrão e os nomes reais do código.
  5. Ganho concreto e o **teste que o prova**.
  6. Opcional: uma limitação honesta ou trade-off, em uma frase.
- **Slides**:
  - título e no máximo 3 bullets curtos, **ou** um trecho de código com um diagrama;
  - código em fonte de pelo menos 18 pt, com as linhas importantes destacadas.
- **Demo**: nada ao vivo que dependa de rede ou do Gemini. Se quiser algo ao vivo, rode os testes novos (`manage.py test ...`, leva segundos) como prova.
- **Arquivo** (D8): `docs/apresentacao/roteiro-design-patterns-backend.md`, contendo:
  - a tabela de tempos;
  - por slide: título, o que aparece na tela, a **fala em texto corrido** (como será dita), o tempo e a frase de transição;
  - os trechos de código e os diagramas (Mermaid ou ASCII);
  - o **banco de perguntas e respostas** (pelo menos 10);
  - os **cortes de emergência**, em ordem;
  - uma **cola de 1 página** com as palavras-chave de cada slide.
- **Tom**: falado, com frases curtas e sem ler o slide. Os nomes dos padrões ficam em inglês (Service Layer, Observer, Strategy) e o resto em português.

---

## 10. Esqueleto do roteiro (preencher na Fase 5)

| Tempo | Slide | Conteúdo | Mensagem-chave |
|---|---|---|---|
| 0:00-0:40 | 1. Abertura | O sistema (manutenção industrial multiempresa, com OS, preventivas, IoT e IA) e o que a fala promete | "Três padrões sustentam este backend." |
| 0:40-1:30 | 2. Arquitetura | Diagrama de camadas (seção 2) | "Toda entrada, seja API, Celery ou linha de comando, passa pelos services." |
| 1:30-4:00 | 3-4. Service Layer | Regra espalhada e várias portas de entrada → `concluir` com view fina e service → a mesma regra na task e no comando → `@transaction.atomic` e o bug que ele fechou (escrita entre empresas) | "Uma regra, um lugar, uma transação." |
| 4:00-6:15 | 5-6. Observer | Auditar sem acoplar → receivers e `ready()` → diagrama Subject/Observer → por que as notificações **não** usam Observer → o cuidado com `update()` em lote | "Quem muda não precisa saber quem está olhando." |
| 6:15-8:30 | 7-8. Strategy | Duas features de IA e uma chamada robusta → `consultar_gemini(..., validar=...)` → as duas estratégias → contrato `ValidadorResposta` → teste de intercambialidade | "O jeito de chamar a IA é fixo; o jeito de validar a resposta é plugável." |
| 8:30-9:10 | 9. Outros padrões | Facade, Query Object (`visiveis_para`), Template Method (DRF), Command (Celery) e Retry | "Padrão entra onde resolve um problema." |
| 9:10-9:30 | 10. Fechamento | O que os padrões garantem, o número de testes e o próximo passo | Frase final de impacto |
| reserva | 11+. Backup | Antes e depois do `resolver_tecnico`; log sem usuário; signals síncronos | Só se perguntarem |

**Banco de perguntas** (o mínimo; responda no roteiro, a partir das dicas):
1. Service Layer não está no GoF. Por que chamar de design pattern?
   - Dica: é do catálogo de Fowler (PoEAA), e design patterns não se limitam ao GoF.
2. Por que `OrdemServicoService` usa métodos estáticos, enquanto a manutenção usa funções de módulo?
   - Dica: os services não guardam estado, e a classe é só um agrupador (a variação "operation script" de Fowler). O papel é o mesmo nas duas formas; é um trade-off de estilo assumido.
3. Por que as notificações não usam signals também?
   - Dica: seção 4.2.
4. Signals são síncronos? E se gravar o log falhar?
   - Dica: rodam na mesma transação. Se o log falhar, a operação inteira desfaz, o que deixa a auditoria do tipo "fail-closed".
5. Django signals são Observer ou Pub/Sub?
   - Dica: são uma variação do Observer com canal de eventos. O objeto `Signal` guarda os inscritos, filtrados por `sender`, e o model nem sabe quem observa.
6. Strategy com função não é só um callback, ou injeção de dependência?
   - Dica: a injeção é o mecanismo de entrega; o Strategy é a intenção, uma família de algoritmos intercambiáveis.
7. Por que não Template Method com herança para as duas IAs?
   - Dica: composição em vez de herança. As features não compartilham estado, só o algoritmo de chamada.
8. Como vocês sabem que funciona?
   - Dica: um teste para cada garantia (rollback, auditoria em lote, intercambialidade), além dos 426 que já existiam.
9. E se o Gemini cair?
   - Dica: retry com backoff exponencial (1 s, 2 s, 4 s..., teto de 8 s). Esgotadas as tentativas, a API responde 503/502 com `codigo`, e a OS pode ser aberta manualmente.
10. Quem fez a alteração que aparece no log?
    - Dica: é uma limitação conhecida. O próximo passo é levar o usuário da request até o receiver.
11. E a concorrência?
    - Dica: `select_for_update` em `_processar_plano`, restrição única em `ExecucaoPlano`, relação 1:1 em `DiagnosticoCausa` e geração idempotente.
12. Por que não usar Repository ou Singleton?
    - Dica: seção 3.
13. O que vocês mudariam com mais tempo?
    - Dica: tirar o Context da triagem para um módulo próprio (P2-1), registrar o usuário no log e uniformizar o estilo dos services.

**Cortes de emergência** (se o ensaio passar de 9:30):
1. O slide 9 vira uma frase.
2. No Observer, o `update()` em lote vai para as perguntas.
3. No Strategy, sai o teste de intercambialidade.
4. Na arquitetura, mostre só o diagrama.

---

## 11. Decisões para o usuário (recomendação entre parênteses)

- **D1 — Padrões principais**: Service Layer, Observer e Strategy? (Sim.)
  - Alternativa: Facade (`NotificacaoService`) no lugar do Strategy. É mais simples de explicar, mas tecnicamente menos interessante e menos ligado ao diferencial de IA.
- **D2 — Escopo das mudanças**: só P0, P0 + P1 ou tudo? (P0 + P1.)
- **D3 — Extrair o Context do Strategy para `ordens_servico/ia_gemini.py` (P2-1)?**
  - (Não, se o prazo for curto: o contrato explícito do P0-3 já deixa o padrão correto.)
  - (Sim, se houver folga: o slide fica mais limpo.)
- **D4 — Auditoria do cancelamento em lote**: loop com `save()` ou signal próprio? (Loop com `save()`.)
- **D5 — Registrar o usuário no log de auditoria?** (Não agora. Cite como limitação e próximo passo.)
- **D6 — Remover o `EmailBackend`, que é redundante?** (Não neste trabalho; basta não citar. Se quiser, faça em PR separado.)
- **D7 — Branch**: criar `refactor/design-patterns` a partir de `feat/pre-diagnostico-ia`? (Sim, porque a `main` não tem o Strategy.)
- **D8 — Formato do roteiro**: Markdown em `docs/apresentacao/` e, se quiser, um deck de slides gerado a partir dele? (Markdown; o deck é opcional.)
- **D9 — Apresentação**:
  - É um apresentador só ou o time dividido?
  - Quem é o público?
  - Qual é a data?
  - (Assumido: um apresentador e banca acadêmica.)

---

## 12. Definição de pronto

- **Testes**:
  - suíte inteira verde: os 426 do baseline mais os novos;
  - nenhum assert antigo alterado (se uma decisão aprovada exigir, explique);
  - cada desvio corrigido tem um teste que **falhou antes** da correção (mostre a falha) e passa depois.
- **Contrato e banco**:
  - `manage.py check` sem problemas;
  - nenhuma mudança no contrato da API (rotas, payloads, códigos HTTP, mensagens, `codigo`);
  - nenhuma migration.
- **Checklists**: os da seção 4 estão todos ✔, ou o ✘ que sobrar está justificado por decisão do usuário.
- **Roteiro**:
  - até ~1.200 palavras de fala;
  - até 9:30 lendo em voz alta;
  - cada arquivo:linha conferido no código final;
  - diagramas com os nomes reais do código.
- **Relatório final**: o que mudou em cada padrão, a saída dos testes e o que não foi verificado.

---

## 13. Fora de escopo

- Frontend.
- Funcionalidades novas, mudanças de model ou migrations, troca de bibliotecas.
- Uniformizar o estilo dos services entre as apps (classe com métodos estáticos ou funções de módulo).
- Capturar o usuário no log (D5) e remover o `EmailBackend` (D6), salvo decisão contrária.
- Ligar `ATOMIC_REQUESTS`.
- Desempenho e concorrência além do que está na seção 5.
