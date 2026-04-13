# Squad Ceny PI

Sistema fullstack Django + Next.js.

![texto alternativo](https://github.com/user-attachments/assets/546b8ee0-d86f-480d-a7f8-320e879da4ce)


---

## Versão das Tecnologias

**Backend**
- Python 3.12
- Django 5.x
- Django REST Framework
- SimpleJWT
- Django CORS Headers
- SQLite

**Frontend**
- Node.js 18+
- Next.js 14 (App Router)
- JavaScript
- CSS

---

## Pré-requisitos

Antes de clonar o projeto, certifique-se de ter instalado:

| Ferramenta | Versão mínima | Verificar com |
|---|---|---|
| Python | 3.10+ | `python --version` |
| Node.js | 18+ | `node --version` |
| Git | 2.x+ | `git --version` |

---

## Instalação

### 1. Clonar o repositório

```bash
git clone https://github.com/SEU_USUARIO/squad-ceny-pi.git
cd squad-ceny-pi
```

---

### 2. Configurar o Backend

#### 2.1 Entrar na pasta do backend

```bash
cd backend
```

#### 2.2 Criar e ativar o ambiente virtual

```bash
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

#### 2.3 Instalar as dependências

```bash
pip install -r requirements.txt
```

#### 2.4 Criar o arquivo de variáveis de ambiente

Crie o arquivo `backend/.env` com o seguinte conteúdo:

```env
SECRET_KEY=django-insecure-troque-esta-chave-por-uma-string-longa-e-aleatoria
DEBUG=True
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

> ⚠️ Para gerar uma SECRET_KEY segura, rode:
> ```bash
> python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
> ```

#### 2.5 Rodar as migrations

```bash
python manage.py migrate
```

#### 2.6 Criar o superusuário

```bash
python manage.py createsuperuser
```

O terminal vai pedir:
```
Email: admin@email.com
Nome: Admin
Password: ********
Password (again): ********
```

#### 2.7 Rodar o servidor do backend

```bash
python manage.py runserver
```

> ✅ Backend rodando em: `http://localhost:8000`

---

### 3. Configurar o Frontend

Abra um **novo terminal** e navegue para a pasta do frontend:

```bash
cd frontend
```

#### 3.1 Instalar as dependências

```bash
npm install
```

#### 3.2 Criar o arquivo de variáveis de ambiente

Crie o arquivo `frontend/.env.local` com o seguinte conteúdo:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

#### 3.3 Rodar o servidor do frontend

```bash
npm run dev
```

> ✅ Frontend rodando em: `http://localhost:3000`

---

## Rodando o projeto no dia a dia

Sempre que for trabalhar no projeto, abra dois terminais:

**Terminal 1 — Backend:**
```bash
cd backend
venv\Scripts\activate   # Windows
python manage.py runserver
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

---

## URLs do sistema

| Serviço | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Django Admin | http://localhost:8000/admin |

---

## Endpoints da API

### Autenticação

| Método | Endpoint | Descrição | Autenticação |
|---|---|---|---|
| POST | `/api/token/` | Login — retorna access e refresh token | Não |
| POST | `/api/token/refresh/` | Renova o access token | Não |

**Body do login:**
```json
{
    "email": "admin@email.com",
    "password": "suasenha"
}
```

### Empresas

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/empresas/` | Lista todas as empresas |
| POST | `/api/empresas/` | Cria uma empresa |
| GET | `/api/empresas/{id}/` | Detalha uma empresa |
| PATCH | `/api/empresas/{id}/` | Atualiza uma empresa |
| DELETE | `/api/empresas/{id}/` | Deleta uma empresa |

### Usuários

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/usuarios/` | Lista todos os usuários |
| POST | `/api/usuarios/` | Cria um usuário |
| GET | `/api/usuarios/{id}/` | Detalha um usuário |
| PATCH | `/api/usuarios/{id}/` | Atualiza um usuário |
| DELETE | `/api/usuarios/{id}/` | Deleta um usuário |

> ⚠️ Todos os endpoints acima exigem o header `Authorization: Bearer <token>`.

---

## Estrutura do Projeto

```
/
├── backend/
│   ├── config/
│   │   ├── settings.py
│   │   └── urls.py
│   ├── empresas/
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   └── urls.py
│   ├── usuarios/
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   └── urls.py
│   ├── venv/              ← não vai para o git
│   ├── .env               ← não vai para o git
│   ├── db.sqlite3         ← não vai para o git
│   ├── manage.py
│   └── requirements.txt
│
└── frontend/
    ├── app/
    │   ├── login/
    │   │   └── page.js
    │   └── dashboard/
    │       └── page.js
    ├── lib/
    │   ├── auth.js
    │   └── api.js
    ├── node_modules/      ← não vai para o git
    ├── .env.local         ← não vai para o git
    └── package.json
```

---

## Perfis de Usuário

| Perfil | Valor |
|---|---|
| Administrador | `admin` |
| Gestor | `gestor` |
| Operador | `operador` |

---
