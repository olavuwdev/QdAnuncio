# QdAnuncio — Sistema de Mídias para TV

Painel web para gerenciar e exibir imagens e vídeos em tela cheia (TV / Chromecast), com login multi-cliente por CPF/CNPJ.

---

## Estrutura

```
QdAnuncio/
├── backend/          # API Node.js/Express
│   ├── src/
│   │   ├── config/db.js
│   │   ├── middleware/auth.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── media.js
│   │   │   ├── playlists.js
│   │   │   ├── settings.js
│   │   │   ├── player.js
│   │   │   └── account.js
│   │   └── index.js
│   ├── uploads/       # Arquivos enviados via upload
│   ├── setup.sql      # Script de criação das tabelas
│   ├── setup-db.js    # Script de setup interativo
│   └── .env           # Variáveis de ambiente
├── frontend/
│   └── index.html     # SPA completo (login + menu + player + admin)
└── README.md
```

---

## Configuração

### 1. Banco de dados

Configure o `.env` em `backend/`:

```
DB_HOST=mysql.ordenaaqui.com.br
DB_USER=ordenaaqui11
DB_PASSWORD=StudyOlavo1
DB_NAME=ordenaaqui11
```

### 2. Criar tabelas

```bash
node backend/setup-db.js
```

### 3. Criar primeiro cliente (interativo)

```bash
node backend/setup-db.js --create-client
```

Informa CPF/CNPJ (só números), nome fantasia e senha.

### 4. Iniciar o servidor

```bash
node backend/src/index.js
# ou em modo watch:
node --watch backend/src/index.js
```

O backend sobe em `http://localhost:3001`.

### 5. Abrir o frontend

Abra `frontend/index.html` diretamente no navegador, ou sirva via qualquer servidor HTTP estático.

> **Atenção:** a URL da API está configurada como `http://localhost:3001/api` no `index.html`. Se o backend estiver em outro host, edite a constante `API` no topo do `<script>`.

---

## Endpoints da API

### Auth
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/login` | Login (CPF/CNPJ + senha) → JWT |
| POST | `/api/auth/logout` | Logout (informativo) |

### Mídias
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/media` | Upload de imagem/vídeo |
| GET | `/api/media` | Listar mídias do cliente |
| PATCH | `/api/media/:id` | Atualizar título/status |
| DELETE | `/api/media/:id` | Remover mídia |

### Playlists
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/playlists` | Listar playlists |
| POST | `/api/playlists` | Criar playlist |
| PATCH | `/api/playlists/:id/activate` | Ativar playlist |
| DELETE | `/api/playlists/:id` | Remover playlist |
| GET | `/api/playlists/:id/items` | Itens da playlist |
| POST | `/api/playlists/:id/items` | Adicionar item |
| PATCH | `/api/playlists/:id/items/:itemId` | Atualizar item |
| DELETE | `/api/playlists/:id/items/:itemId` | Remover item |
| PUT | `/api/playlists/:id/items/reorder` | Reordenar itens |

### Settings / Player / Conta
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/settings` | Buscar configurações |
| PATCH | `/api/settings` | Salvar configurações |
| GET | `/api/player/active` | Playlist ativa + settings (para o player) |
| GET | `/api/account` | Dados da conta |
| PATCH | `/api/account` | Atualizar nome |
| POST | `/api/account/change-password` | Trocar senha |

---

## Funcionalidades

- **Login** por CPF ou CNPJ + senha (hash bcrypt), rate limit (10 tentativas / 10 min)
- **Menu** com 2 botões: OFERTAS e ADMINISTRAR
- **Player OFERTAS**: fullscreen, loop infinito, transições (fade/slide/zoom), tempo por imagem configurável, vídeos tocam até o fim, pré-carregamento, progresso visual
- **Painel Admin**:
  - Upload de imagens e vídeos (drag & drop)
  - Grid de mídias com ativar/desativar/remover
  - Gerenciamento de playlists com drag-and-drop para ordenar
  - Configuração de tempo por item
  - Configurações do player (transição, mudo, fullscreen)
  - Troca de senha e dados da conta
- **Multi-tenant**: todos os dados isolados por `client_id`
- **JWT**: autenticação stateless, token de 8h
