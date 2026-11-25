# Roteiro — Design patterns (GoF) do backend + SOLID (squad Ceny)

**Quarta-feira, 25/11/2026 · 3 apresentadores · alvo: 9 min 20 s (limite: 10 min)**

Público: turma de Sistemas de Informação e professor de programação. Os três padrões são do livro do **GoF** (*Design Patterns*, Gamma, Helm, Johnson e Vlissides, 1994):

| Padrão | Família GoF | Princípios SOLID que ele ajuda a cumprir |
|---|---|---|
| **Facade** | Estrutural | **S**: responsabilidade única |
| **Observer** | Comportamental | **O**: aberto/fechado · **S**: responsabilidade única |
| **Strategy** | Comportamental | **O**: aberto/fechado · **L**: substituição de Liskov · **D**: inversão de dependência |

> Só citamos o princípio que o código realmente mostra. Nenhum padrão cumpre as cinco letras, e dizer isso é mais honesto (e mais convincente) do que forçar.

| Quem | Tempo | Parte |
|---|---|---|
| **Pessoa 1** | 0:00 – 3:20 | Abertura e **Facade** |
| **Pessoa 2** | 3:20 – 5:50 | **Observer** |
| **Pessoa 3** | 5:50 – 9:20 | **Strategy** e fechamento |

Troque "Pessoa 1/2/3" pelos nomes. As falas estão escritas como serão ditas: leiam no ensaio e depois falem com as próprias palavras.

**A mesma sequência em todos os padrões:**
1. o problema que tínhamos;
2. o padrão em uma frase e uma analogia;
3. **por que usamos**;
4. onde está no código;
5. **SOLID**;
6. o teste que prova.

---

## Slide 1 — Abertura · Pessoa 1 · 0:00–0:45

**Na tela**
- Título: *Por dentro do backend: 3 padrões do GoF e o SOLID*.
- Os nomes dos três.
- Uma linha: Django + Django REST Framework · tarefas agendadas · IA (Gemini).

**Fala**
> Boa noite! Nós somos [nomes], do squad Ceny. O nosso sistema faz gestão de manutenção industrial. Qualquer funcionário abre uma ordem de serviço, a OS, escrevendo o problema com as próprias palavras. A inteligência artificial sugere a prioridade, o administrador aprova, e o técnico executa e conclui. O sistema também gera manutenções preventivas sozinho.
>
> Hoje vamos mostrar o backend através de três padrões do livro do GoF: Facade, Observer e Strategy. Para cada um: o problema, por que escolhemos, onde ele está no código e quais princípios do SOLID ele ajuda a cumprir.

---

## Slide 2 — Facade: o problema e o padrão · Pessoa 1 · 0:45–1:50

**Na tela**
- **Facade**: GoF, padrão estrutural.
- "Fornecer uma interface única e simplificada para um conjunto de partes de um subsistema."
- 🛎️ Check-out no hotel: você fala só com a recepção, e ela resolve frigobar, governança e pagamento.
- **Por que usamos**: concluir uma OS mexe em 5 partes do sistema.

**Fala**
> Quando você faz check-out num hotel, não vai à cozinha conferir o frigobar, nem à lavanderia, nem ao financeiro. Você fala só com a recepção, e ela coordena tudo. Isso é o Facade: uma interface única e simples na frente de um conjunto de partes complicadas.
>
> Por que precisamos dele? Porque concluir uma OS mexe em cinco partes ao mesmo tempo: a própria OS, o equipamento, que volta a funcionar, o plano de manutenção preventiva, o diagnóstico da IA e as notificações. Se a tela tivesse que conhecer e chamar cada uma dessas partes, qualquer mudança em uma delas quebraria a tela.

---

## Slide 3 — Facade no código + SOLID · Pessoa 1 · 1:50–3:20

**Na tela** (dois blocos lado a lado)

`ordens_servico/views.py:133` · **quem usa (a view)**
```python
def concluir(self, request, pk=None):
    ordem = self.get_object()
    if not OrdemServicoService.tecnico_atribuido(request.user, ordem):
        return self._forbidden(MSG_CONCLUIR_TECNICO)
    try:
        ordem = OrdemServicoService.concluir(ordem, ...)   # ← uma chamada só
    except ValueError as erro:
        return self._bad_request(erro)
    return self._ok(ordem)
```

`ordens_servico/services.py:115` · **a fachada**
```python
@staticmethod
@transaction.atomic          # tudo ou nada
def concluir(ordem, relatorio=None, proxima_manutencao=None, ...):
    if ordem.status != OrdemServico.Status.EM_ANDAMENTO:
        raise ValueError("Apenas OS em andamento podem ser concluidas.")
    ...
    OrdemServicoService._atualizar_manutencao_equipamento(...)
    OrdemServicoService._atualizar_plano_origem(ordem, agora)
    OrdemServicoService._liberar_equipamento_se_sem_outra_os_ativa(ordem)
    NotificacaoService.notificar_conclusao(ordem)   # ← outra fachada
```

**Faixa SOLID**: **S**, responsabilidade única. A view cuida só do HTTP; a fachada coordena; cada passo é um método com uma única tarefa.

**Fala**
> À esquerda, a view, que é quem recebe o pedido da tela. Ela confere se quem pede é o técnico da OS e faz uma chamada só: `concluir`. À direita, a fachada, que coordena o equipamento, o plano e as notificações. E reparem na última linha: as notificações têm a sua própria fachada, o `NotificacaoService`. Quem avisa não precisa saber quem recebe, nem como o aviso é gravado.
>
> A linha de cima, `transaction.atomic`, garante que tudo aconteça ou nada aconteça. Preparando a apresentação, descobrimos que ela faltava, e uma aprovação recusada ainda alterava um dado de outra empresa. Corrigimos, e há testes que simulam uma falha no meio e conferem que nada ficou pela metade.
>
> No SOLID, o Facade ajuda no S, a responsabilidade única. A view cuida só do HTTP, a fachada só coordena, e cada passo é um método com uma tarefa. Passo para [Pessoa 2], que mostra o que acontece toda vez que uma OS muda.

---

## Slide 4 — Observer: o problema e o padrão · Pessoa 2 · 3:20–4:20

**Na tela**
- **Observer**: GoF, padrão comportamental.
- "Quando um objeto muda de estado, todos os seus dependentes são avisados automaticamente."
- 🔔 Inscrever-se num canal: o canal publica e não sabe quem são os inscritos.
- **Por que usamos**: auditoria vale para o sistema inteiro, sem poder ter buraco.

**Fala**
> Todo sistema de manutenção precisa de auditoria: saber quando cada OS foi criada, alterada ou excluída. O jeito ingênuo seria escrever "grava no log" em cada lugar que salva uma OS. Só que são muitos lugares: a tela, a tarefa das preventivas, o simulador de sensores... Basta esquecer um para a auditoria ficar com buraco.
>
> O Observer resolve isso: quando um objeto muda de estado, todos os seus dependentes são avisados automaticamente. É como se inscrever num canal: o canal só publica, não sabe quem você é, e quem é inscrito recebe o aviso. Aqui, o objeto observado é a ordem de serviço, e o observador é o log de auditoria.

---

## Slide 5 — Observer no código + SOLID · Pessoa 2 · 4:20–5:50

**Na tela**

`notificacoes/signals.py:32` · **o observador**
```python
@receiver(post_save, sender=OrdemServico)   # "me avise quando uma OS for salva"
def log_ordem_servico(sender, instance, created, **kwargs):
    acao = "Criação" if created else "Atualização"
    _registrar_log("ordens_servico", instance.pk, f"{acao} de OS: {instance.titulo}")
```
Diagrama:
```
OrdemServico ──(post_save: "fui salva")──► log_ordem_servico ──► LogAuditoria
 (observado)                                  (observador)
```

**Faixa SOLID**
- **O**, aberto/fechado: para um novo observador (ex.: mandar e-mail), basta uma função nova; a OS não muda.
- **S**, responsabilidade única: a OS não sabe auditar.

**Fala**
> No Django, esse padrão já vem pronto num mecanismo chamado *signals*. Quando uma OS é salva, o Django dispara o aviso `post_save`, e esta função, marcada com `@receiver`, está inscrita para ouvir e grava o log. O código das ordens de serviço não importa nada de auditoria: quem muda não precisa saber quem está olhando.
>
> No SOLID, isso é o O, aberto para extensão e fechado para modificação. Se amanhã quisermos mandar um e-mail toda vez que uma OS mudar, escrevemos mais uma função inscrita, e a OS continua intacta. E também o S, já que a OS não carrega a responsabilidade de auditar.
>
> Um cuidado que aprendemos: o atalho `update`, que altera vários registros de uma vez, não dispara o aviso. Nosso botão de cancelar OS em lote usava esse atalho, e os cancelamentos sumiam do log. Trocamos, e agora um teste garante um log por cancelamento. Passo para [Pessoa 3], com a parte de inteligência artificial.

---

## Slide 6 — Strategy: o problema e o padrão · Pessoa 3 · 5:50–6:50

**Na tela**
- **Strategy**: GoF, padrão comportamental.
- "Definir uma família de algoritmos, encapsular cada um e torná-los intercambiáveis."
- 📝 A prova é aplicada sempre do mesmo jeito (o **Context**); o gabarito muda por disciplina (a **Strategy**).
- **Por que usamos**: duas funcionalidades de IA com a mesma chamada robusta; só muda a validação da resposta.

**Fala**
> Temos duas funcionalidades com a IA do Google, o Gemini. Na triagem, o usuário escreve o problema e a IA sugere o título, a prioridade e o equipamento. No pré-diagnóstico, a IA sugere ao técnico as causas prováveis da falha.
>
> As duas chamam a IA do mesmo jeito cuidadoso: com tempo limite, tentando de novo se falhar e transformando erro técnico em mensagem amigável. O que muda é só como conferir a resposta, porque a IA pode errar e cada funcionalidade tem a sua regra.
>
> Isso é o Strategy. Pensem numa prova: aplicar e recolher é sempre igual, mas o gabarito muda de disciplina para disciplina. O processo é o *Context*, e o gabarito é a *Strategy*. Usamos para não duplicar a parte mais delicada do código.

---

## Slide 7 — Strategy no código · Pessoa 3 · 6:50–7:55

**Na tela**

`ordens_servico/triagem_ia.py:249` · **o contrato (a "interface" da estratégia)**
```python
# Recebe o JSON da IA e devolve os campos limpos;
# levanta RespostaIAInvalida quando a resposta não serve.
ValidadorResposta = Callable[[dict], dict]
```
`triagem_ia.py:369` · **o Context: o processo fixo**
```python
def consultar_gemini(instrucao, conteudo, schema,
                     validar: ValidadorResposta, contexto, rotulo="triagem_ia"):
    ...
    for tentativa in range(1, total_tentativas + 1):
        try:
            resposta = cliente.models.generate_content(...)
            return validar(_ler_json(resposta.text))   # ← usa a estratégia
        except RespostaIAInvalida as erro:             # ← estratégia recusou:
            falha, motivo = erro, "resposta_invalida"  #   tenta de novo
```
**Os clientes escolhem a estratégia**
```python
consultar_gemini(..., _validar_resposta, ...)   # triagem      (triagem_ia.py:364)
consultar_gemini(..., validar_resposta, ...)    # diagnóstico  (diagnostico_ia.py:209)
```

**Fala**
> No topo, o contrato. Um validador recebe a resposta da IA e devolve os dados limpos, ou avisa com o erro `RespostaIAInvalida`. No meio, o Context, a função `consultar_gemini`. O laço de tentativas é sempre o mesmo, e lá dentro ela chama a estratégia que recebeu. Se o validador recusa a resposta, o Context tenta de novo. Embaixo, os dois clientes: a triagem passa o validador dela, e o diagnóstico passa o dele. Como em Python funções também são objetos, a estratégia pode ser uma função em vez de uma classe.

---

## Slide 8 — SOLID no Strategy · Pessoa 3 · 7:55–8:40

**Na tela**
- **O**, aberto/fechado: nova funcionalidade de IA = novo validador; `consultar_gemini` não muda.
- **L**, substituição de Liskov: qualquer validador que cumpra o contrato funciona no lugar do outro.
- **D**, inversão de dependência: `consultar_gemini` depende do contrato `ValidadorResposta`, não dos validadores concretos.
- ✅ Teste: um validador inventado no teste funciona sem mudar uma linha (`test_padroes.py`).

**Fala**
> O Strategy é o padrão em que o SOLID mais aparece. Tem o O: uma terceira funcionalidade de IA custa só um validador novo, e o `consultar_gemini` não muda. Tem o L, de Liskov: qualquer validador que cumpra o contrato pode substituir o outro. E tem o D, inversão de dependência: o Context depende do contrato, e não dos validadores concretos. Para provar, temos um teste que passa um validador inventado, e o Context funciona sem mudar uma linha.

---

## Slide 9 — Fechamento · Pessoa 3 · 8:40–9:20

**Na tela**

| Padrão (GoF) | Problema que resolveu | SOLID |
|---|---|---|
| Facade | Uma chamada simples para uma ação que mexe em 5 partes | S |
| Observer | Auditoria automática, sem buraco | O, S |
| Strategy | IA com validação plugável | O, L, D |

- **432 testes automatizados** (6 só para os padrões) · rodam em ~4 s.

**Fala**
> Resumindo: o Facade esconde a complexidade atrás de uma chamada simples, o Observer garante a auditoria sem acoplar o código, e o Strategy deixa a validação da IA plugável. Em cada um, mostramos o princípio SOLID que ele ajuda a cumprir. E tudo é verificado: são 432 testes automatizados, seis deles só para os padrões, rodando em uns quatro segundos. Obrigado! Ficamos à disposição para perguntas.

---

## Perguntas prováveis (quem responde)

| # | Pergunta | Resposta curta | Quem |
|---|---|---|---|
| 1 | A classe se chama `OrdemServicoService`. Por que é Facade? | O nome é convenção do projeto. O papel é o de Facade: uma interface simples (`concluir`) na frente de várias partes (OS, equipamento, plano, diagnóstico, notificações), e quem chama não conhece essas partes. | P1 |
| 2 | Qual a diferença entre Facade e Adapter? | O Adapter converte uma interface em outra que o cliente espera. O Facade simplifica um conjunto de partes, criando uma interface nova e mais simples. | P1 |
| 3 | O que o `transaction.atomic` faz? | Abre uma transação no banco: se qualquer passo der erro, tudo o que foi gravado dentro dela é desfeito. | P1 |
| 4 | O Facade não vira uma "classe Deus" que faz tudo? | Ele só coordena; cada passo é um método pequeno, e as notificações têm a sua própria fachada. Se crescer demais, dá para dividir em fachadas menores. | P1 |
| 5 | Por que as notificações não usam Observer também? | Precisam de contexto que o aviso do Django não carrega (quem aprovou, qual técnico). Por isso ficam como chamada direta na fachada. | P2 |
| 6 | O signal roda junto ou depois? E se o log falhar? | Roda na hora, dentro da mesma transação. Se o log falhar, a operação inteira é desfeita. | P2 |
| 7 | O log mostra quem fez a alteração? | Ainda não: o aviso do Django não sabe qual usuário fez a requisição. É uma limitação conhecida e o próximo passo. | P2 |
| 8 | Signals do Django são mesmo Observer? | São uma variação com um "canal de eventos" no meio: o objeto `Signal` guarda a lista de inscritos, então a OS nem precisa guardar a lista. A intenção do GoF é a mesma. | P2 |
| 9 | Strategy com função não é só um callback? | O callback é o mecanismo; o Strategy é a intenção: uma família de algoritmos intercambiáveis com o mesmo contrato. Em Python, usar funções é o jeito idiomático. | P3 |
| 10 | Por que não Template Method, com herança? | As duas IAs não compartilham estado, só o processo. Passar a validação como parâmetro (composição) é mais simples do que criar subclasses. | P3 |
| 11 | Onde está o I (segregação de interface)? | O contrato do Strategy é mínimo, uma função só, o que vai na linha do I. Mas não tratamos como destaque; preferimos mostrar só o que é evidente. | P3 |
| 12 | E se a IA estiver fora do ar? | O sistema tenta de novo, esperando 1 s e depois 2 s. Se continuar falhando, mostra uma mensagem amigável, e a OS pode ser aberta manualmente. | P3 |
| 13 | Como sabem que funciona? | Testes: um que simula falha no meio da fachada (tudo ou nada), um que confere o log de cada cancelamento e um que troca o validador. | Qualquer um |

---

## Se estiver atrasado (cortes, nesta ordem)

1. **Slide 5**: cortar o parágrafo do `update` em lote.
2. **Slide 3**: cortar a frase sobre a fachada das notificações.
3. **Slide 7**: cortar a frase "funções também são objetos".
4. **Slide 8**: dizer só o O e o D.

---

## Cola de bolso (uma linha por slide)

1. Sistema de manutenção · OS por texto livre · IA · 3 padrões GoF + SOLID.
2. Hotel: só a recepção · concluir mexe em 5 partes.
3. View faz uma chamada · fachada coordena · notificações = outra fachada · `atomic` = tudo ou nada · bug corrigido · **S**.
4. Auditoria com buraco · canal e inscritos.
5. `post_save` + `@receiver` · OS não conhece o log · **O** (e-mail novo sem mexer na OS) e **S** · `update` não avisa.
6. Triagem + diagnóstico · mesma chamada · prova e gabarito.
7. Contrato · laço fixo chama `validar` · recusa = tenta de novo · dois clientes.
8. **O** (validador novo) · **L** (troca um pelo outro) · **D** (depende do contrato) · teste com validador inventado.
9. Tabela-resumo · 432 testes em ~4 s · obrigado.

---

## Checklist até quarta

- [ ] Montar os slides com fonte de código ≥ 18 pt e as linhas importantes destacadas (`@transaction.atomic`, `@receiver`, `return validar(...)`).
- [ ] Revisar o SOLID com a turma em mente: se ninguém viu SOLID, dizer o nome completo de cada letra na primeira vez.
- [ ] Ensaiar cronometrando: cada pessoa dentro da sua janela; total ≤ 9:30.
- [ ] Combinar as frases de passagem ("Passo para [Pessoa 2]...").
- [ ] Opcional, como prova ao vivo, sem internet: `cd backend` e `venv\Scripts\python.exe manage.py test ordens_servico.test_padroes -v 2` (6 testes, menos de 1 s). Tirar um print antes, como reserva.
- [ ] Cada pessoa ler as perguntas da sua parte.
