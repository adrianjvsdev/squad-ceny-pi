# Squad Ceny PI

Sistema fullstack de gestão de manutenção (Django + Next.js), com ordens de serviço, manutenções preventivas, simulação de IoT e triagem/pré-diagnóstico por IA (Gemini).

![Tela do sistema](https://github.com/user-attachments/assets/546b8ee0-d86f-480d-a7f8-320e879da4ce)

---

## Sumário

- [Tecnologias](#tecnologias)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
  - [1. Clonar o repositório](#1-clonar-o-repositório)
  - [2. Backend](#2-backend)
  - [3. Banco de dados](#3-banco-de-dados)
  - [4. Celery e Redis](#4-celery-e-redis)
  - [5. Frontend](#5-frontend)
- [Rodando no dia a dia](#rodando-no-dia-a-dia)
- [Testes](#testes)
- [Comandos úteis](#comandos-úteis)
- [URLs do sistema](#urls-do-sistema)
- [Endpoints da API](#endpoints-da-api)
- [Perfis de usuário](#perfis-de-usuário)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Documentação complementar](#documentação-complementar)

---

## Tecnologias

**Backend**
- Python 3.12+
- Django 6
- Django REST Framework + SimpleJWT
- Django CORS Headers
- Celery + django-celery-beat (Redis como broker)
- Google Gemini (`google-genai`) para triagem e pré-diagnóstico
- **PostgreSQL** (banco do projeto) · SQLite opcional para testes locais

**Frontend**
- Node.js 20.9+
- Next.js 16 (App Router)
- React 19
- Axios
- JavaScript + CSS

---

## Pré-requisitos

| Ferramenta | Versão mínima | Verificar com | Obrigatório? |
|---|---|---|---|
| Python | 3.12+ | `python --version` | Sim |
| Node.js | 20.9+ | `node --version` | Sim |
| Git | 2.x | `git --version` | Sim |
| PostgreSQL | 14+ | `psql --version` | Recomendado (dá para usar SQLite em testes) |
| Redis | 6+ | `redis-cli ping` | Só para rodar o Celery |

---

## Instalação

### 1. Clonar o repositório

```bash
git clone https://github.com/adrianjvsdev/squad-ceny-pi.git
cd squad-ceny-pi
```

### 2. Backend

#### 2.1 Criar e ativar o ambiente virtual

```bash
cd backend
python -m venv venv
```

**Windows:**
```bash
venv\Scripts\activate
```

**macOS/Linux:**
```bash
source venv/bin/activate
```

> ✅ O terminal deve exibir `(venv)` no início da linha.

#### 2.2 Instalar as dependências

```bash
pip install -r requirements.txt
```

#### 2.3 Criar o arquivo `.env`

Crie o arquivo `backend/.env`:

```env
SECRET_KEY=troque-por-uma-string-longa-e-aleatoria
DEBUG=True
CORS_ALLOWED_ORIGINS=http://localhost:3000
GEMINI_API_KEY=sua-chave-aqui

# Banco de dados: veja a seção 3
DB_ENGINE=django.db.backends.postgresql
DB_NAME=squad_ceny
DB_USER=postgres
DB_PASSWORD=sua-senha
DB_HOST=localhost
DB_PORT=5432
```

> ⚠️ Para gerar uma `SECRET_KEY` segura:
> ```bash
> python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
> ```

<details>
<summary>Variáveis opcionais (já têm valor padrão)</summary>

| Variável | Padrão | Para que serve |
|---|---|---|
| `GEMINI_MODEL` | `gemini-3.8-flash` | Modelo usado na triagem e no pré-diagnóstico |
| `GEMINI_TIMEOUT_SECONDS` | `10` | Tempo limite de cada chamada ao Gemini |
| `GEMINI_MAX_RETRIES` | `2` | Novas tentativas em caso de falha |
| `TRIAGEM_IA_THROTTLE_RATE` | `5/min` | Limite de requisições da triagem por IA |
| `DIAGNOSTICO_IA_THROTTLE_RATE` | `5/min` | Limite de requisições do pré-diagnóstico |
| `PREVENTIVA_TOLERANCIA_DIAS` | `3` | Dias após a data prevista em que a preventiva ainda conta "no prazo" |
| `PREVENTIVA_AVISO_DIAS` | `3` | Com quantos dias de antecedência os admins são avisados do vencimento |

</details>

### 3. Banco de dados

O banco é escolhido pela variável `DB_ENGINE` no `backend/.env`. Não é preciso mexer no `settings.py`.

#### Opção A: PostgreSQL (padrão do projeto)

1. Instale o PostgreSQL e crie o banco:
   ```bash
   psql -U postgres -c "CREATE DATABASE squad_ceny;"
   ```
2. Preencha `DB_ENGINE`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST` e `DB_PORT` no `.env`, como no exemplo da seção 2.3.

> O driver (`psycopg2-binary`) já vem no `requirements.txt`.

#### Opção B: SQLite (opcional, para testes)

Para testar rápido sem instalar o PostgreSQL, **remova (ou comente) as variáveis `DB_*`** do `.env`. Sem `DB_ENGINE`, o Django usa o SQLite e cria o arquivo `backend/db.sqlite3` sozinho.

#### Rodar as migrations e criar o superusuário

Com qualquer uma das opções:

```bash
python manage.py migrate
python manage.py createsuperuser
```

O `createsuperuser` pede e-mail, nome e senha.

#### Rodar o servidor

```bash
python manage.py runserver
```

> ✅ Backend rodando em `http://localhost:8000`

<details>
<summary>Migrar dados de um SQLite antigo para o PostgreSQL</summary>

1. Com o `.env` ainda **sem** as variáveis `DB_*` (SQLite), exporte os dados:
   ```bash
   python manage.py dumpdata --natural-foreign --exclude contenttypes --exclude auth.permission > dados.json
   ```
2. Adicione as variáveis `DB_*` do PostgreSQL ao `.env` e rode `python manage.py migrate`.
3. Importe os dados:
   ```bash
   python manage.py loaddata dados.json
   ```

O `dados.json` já está no `.gitignore`.

</details>

### 4. Celery e Redis

O Celery roda as tarefas agendadas:
- **verificação das manutenções preventivas**: uma vez por hora;
- **simulação de leituras IoT**: a cada 5 minutos.

Ele precisa do **Redis** rodando em `localhost:6379`.

- **Windows:** instale o [Memurai](https://www.memurai.com/get-memurai) (Redis para Windows) e confira se o serviço está ativo.
- **macOS/Linux:** instale o `redis` pelo gerenciador de pacotes e inicie o serviço.

Com o backend rodando, abra **dois terminais novos** na pasta `backend`, com o ambiente virtual ativado:

**Celery Worker:**
```bash
celery -A config worker --pool=solo --loglevel=info
```

**Celery Beat:**
```bash
celery -A config beat --loglevel=info
```

> 💡 O Celery é opcional para desenvolvimento. Sem ele, gere as OS preventivas manualmente com `python manage.py gerar_preventivas`.

### 5. Frontend

Em um **novo terminal**:

```bash
cd frontend
npm install
npm run dev
```

> ✅ Frontend rodando em `http://localhost:3000`

> ℹ️ O endereço da API está fixo em `frontend/lib/api.js` (`http://localhost:8000`). Se o backend rodar em outra porta, altere lá.

---

## Rodando no dia a dia

| Terminal | Pasta | Comando |
|---|---|---|
| 1. Backend | `backend` (venv ativo) | `python manage.py runserver` |
| 2. Frontend | `frontend` | `npm run dev` |
| 3. Celery Worker *(opcional)* | `backend` (venv ativo) | `celery -A config worker --pool=solo --loglevel=info` |
| 4. Celery Beat *(opcional)* | `backend` (venv ativo) | `celery -A config beat --loglevel=info` |

Para ativar o venv: `venv\Scripts\activate` (Windows) ou `source venv/bin/activate` (macOS/Linux).

---

## Testes

Na pasta `backend`, com o venv ativo:

```bash
python manage.py test
```

O Django cria e apaga um banco de teste temporário no mesmo motor configurado no `.env`. Com PostgreSQL, o usuário do banco precisa ter permissão para criar bancos (`CREATEDB`). Para rodar os testes sem PostgreSQL, deixe o `.env` sem as variáveis `DB_*` (SQLite).

---

## Comandos úteis

| Comando | O que faz |
|---|---|
| `python manage.py seed_mock_data --with-os --with-planos` | Cria dados de demonstração: empresa, usuários, equipamentos, OS, 7 planos preventivos com 3 meses de histórico e pré-diagnósticos com causa confirmada. Recria os planos dos equipamentos `DEMO-EQ-*` |
| `python manage.py gerar_preventivas` | Gera as OS preventivas vencidas e os avisos de vencimento, como a task do Celery faria (útil sem worker/beat) |
| `python manage.py verificar_dados_cruzados` | Auditoria somente leitura de dados inconsistentes entre empresas |

---

## URLs do sistema

| Serviço | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000/api/ |
| Django Admin | http://localhost:8000/admin/ |

---

## Endpoints da API

> ⚠️ Exceto login, renovação/verificação de token e registro, todos os endpoints exigem o header `Authorization: Bearer <token>`.

### Autenticação

| Método | Endpoint | Descrição |
|---|---|---|
| POST | `/api/token/` | Login: retorna `access` e `refresh` |
| POST | `/api/token/refresh/` | Renova o access token |
| POST | `/api/token/verify/` | Verifica o access token |
| POST | `/api/registro/` | Registro público |

**Body do login:**
```json
{
    "email": "admin@email.com",
    "password": "suasenha"
}
```

### Empresas e setores

| Método | Endpoint | Descrição |
|---|---|---|
| GET / POST | `/api/empresas/` | Lista / cria empresas |
| GET / PATCH / DELETE | `/api/empresas/{id}/` | Detalha / atualiza / exclui uma empresa |
| GET / POST | `/api/setores/` | Lista / cria setores |
| GET / PATCH / DELETE | `/api/setores/{id}/` | Detalha / atualiza / exclui um setor |

### Usuários

| Método | Endpoint | Descrição |
|---|---|---|
| GET / POST | `/api/usuarios/` | Lista / cria usuários |
| GET / PATCH / DELETE | `/api/usuarios/{id}/` | Detalha / atualiza / exclui um usuário |
| GET | `/api/usuarios/me/` | Dados do usuário logado |
| PUT / PATCH | `/api/usuarios/update_profile/` | O usuário edita o próprio cadastro (sem alterar o perfil) |
| GET / POST | `/api/usuario-setor/` | Vínculos de usuários com setores |

### Equipamentos

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/equipamentos/` | Lista os equipamentos visíveis ao usuário |
| POST | `/api/equipamentos/` | Cadastra (admin). A TAG é gerada pelo nome: iniciais das duas primeiras palavras (ou as duas primeiras letras) + número sequencial (`Peneira Molecular` → `PM-001`) |
| PATCH / DELETE | `/api/equipamentos/{id}/` | Edita / exclui (admin). A TAG não muda depois do cadastro |
| GET / POST | `/api/tipos-equipamento/` | Tipos de equipamento |

### Ordens de serviço

| Método | Endpoint | Descrição |
|---|---|---|
| GET / POST | `/api/ordens-servico/` | Lista / abre ordens de serviço |
| GET / PATCH / DELETE | `/api/ordens-servico/{id}/` | Detalha / atualiza / exclui uma OS |
| PATCH | `/api/ordens-servico/{id}/aprovar/` · `rejeitar/` · `reabrir/` · `iniciar/` · `concluir/` | Mudanças de status da OS |
| PATCH | `/api/ordens-servico/desativar-abertas/` | Desativa as OS abertas |

### Triagem e pré-diagnóstico por IA

| Método | Endpoint | Descrição |
|---|---|---|
| POST | `/api/ordens-servico/triagem-ia/` | Triagem de um relato livre para revisão (não grava). `id_equipamento` é opcional |
| POST | `/api/ordens-servico/{id}/diagnostico/` | Gera o pré-diagnóstico de causa (admin ou técnico atribuído) |
| PATCH | `/api/ordens-servico/{id}/diagnostico/descartar/` | Descarta o pré-diagnóstico, informando `motivo` (admin) |
| GET | `/api/ordens-servico/diagnostico/indicadores/?dias=` | Taxa de acerto da IA nos pré-diagnósticos |

Detalhes: [docs/triagem_ia.md](docs/triagem_ia.md) e [docs/diagnostico_ia.md](docs/diagnostico_ia.md).

### Planos de manutenção (aba Preventivas)

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/planos-manutencao/` | Lista os planos com a situação calculada. Filtros: `id_equipamento`, `id_setor`, `tipo`, `ativo`, `tecnico=me` |
| POST | `/api/planos-manutencao/` | Agenda um plano (admin) |
| PATCH / DELETE | `/api/planos-manutencao/{id}/` | Edita / exclui um plano (admin) |
| PATCH | `/api/planos-manutencao/{id}/pausar/` · `retomar/` · `executar-agora/` · `pular-proxima/` | Ações sobre o plano (admin) |
| GET | `/api/planos-manutencao/{id}/execucoes/` | Histórico de ocorrências do plano |
| GET | `/api/planos-manutencao/agenda/?inicio=&fim=` | Ocorrências registradas e projetadas (até 366 dias) |
| GET | `/api/planos-manutencao/indicadores/?dias=` | Aderência, atrasadas, próximos 7 dias, preventiva x corretiva e carga por técnico |

Regras, cálculos e configuração: [docs/manutencao_preventiva.md](docs/manutencao_preventiva.md).

### IoT, notificações e auditoria

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/iot-status/` | Status e anomalias dos equipamentos com IoT |
| GET | `/api/notificacoes/` | Notificações do usuário |
| PATCH | `/api/notificacoes/{id}/marcar-lida/` | Marca uma notificação como lida |
| PATCH | `/api/notificacoes/marcar-todas-lidas/` | Marca todas como lidas |
| GET | `/api/logs-auditoria/` | Logs de auditoria |
| GET | `/api/dashboard/` | Dados da página inicial do painel |

---

## Perfis de usuário

**Perfil geral** (`Usuario.perfil`):

| Perfil | Valor |
|---|---|
| Administrador | `admin` |
| Técnico | `tecnico` |
| Operador | `operador` (padrão) |

**Perfil no setor** (`UsuarioSetor.perfil_no_setor`): `gestor`, `operador`, `visualizador`, `tecnico`.

---

## Estrutura do projeto

```
squad-ceny-pi/
├── backend/
│   ├── config/            # settings, urls, celery, utilitários de teste
│   ├── api/               # endpoint do dashboard
│   ├── empresas/          # empresas e setores
│   ├── usuarios/          # usuários, autenticação JWT, vínculos com setores
│   ├── equipamentos/      # equipamentos e tipos
│   ├── ordens_servico/    # OS, triagem e pré-diagnóstico por IA
│   ├── manutencao/        # planos preventivos, IoT simulado, tasks do Celery
│   ├── notificacoes/      # notificações e logs de auditoria
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env               ← não vai para o git
│   ├── venv/              ← não vai para o git
│   └── db.sqlite3         ← só existe se usar SQLite; não vai para o git
│
├── frontend/
│   ├── app/
│   │   ├── login/         # tela de login
│   │   ├── dashboard/     # painel principal
│   │   ├── components/    # layout, páginas e componentes do painel
│   │   └── hooks/
│   ├── lib/               # cliente da API (api.js), auth e regras de cada módulo
│   ├── public/
│   └── package.json
│
└── docs/                  # documentação técnica e artefatos do projeto
```

---

## Documentação complementar

| Documento | Conteúdo |
|---|---|
| [docs/manutencao_preventiva.md](docs/manutencao_preventiva.md) | Regras e cálculos das preventivas |
| [docs/triagem_ia.md](docs/triagem_ia.md) | Triagem de chamados por IA |
| [docs/diagnostico_ia.md](docs/diagnostico_ia.md) | Pré-diagnóstico de causa por IA |
| [docs/PDM_ML.md](docs/PDM_ML.md) | PDM (link para o Lucidchart) |
| [docs/EAP.md](docs/EAP.md) | EAP, Estrutura Analítica do Projeto (link para o Lucidchart) |
| `docs/*.pdf` | TAP, EAP, Matriz RACI, PDM, ROI/Ishikawa e diagramas de sequência |
