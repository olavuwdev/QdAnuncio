# SPEC — Refatoração: Unificar Backend + Frontend em PHP

---

## 1) Objetivo da refatoração

Eliminar a dependência do Node.js (Express, npm, etc.) unificando o projeto em uma **estrutura PHP pura + HTML/JS estático**. O resultado final é um único diretório servido por Apache/Nginx com PHP, onde:

- O **frontend** (HTML/CSS/JS) é servido diretamente como arquivos estáticos.
- O **backend** são **controladores PHP** que recebem requisições da API e interagem com o MySQL via `mysqli`/`PDO` nativo.
- **Nenhuma biblioteca externa do PHP** (sem Composer, sem frameworks).
- O JavaScript do frontend é extraído do `index.html` inline para um arquivo dedicado em `assets/js/`.

---

## 2) Estrutura de pastas proposta

```
QdAnuncio/
├── index.html                          ← Frontend (HTML + CSS inline, JS via <script src>)
├── assets/
│   └── js/
│       └── app.js                      ← Toda lógica JS do frontend (extraída do <script> inline)
├── uploads/                            ← Pasta de uploads de mídia (imagens/vídeos)
├── controladores/                      ← Backend PHP (cada arquivo = um endpoint da API)
│   ├── _db.php                         ← Conexão com MySQL (PDO)
│   ├── _auth.php                       ← Helper de autenticação JWT (verificar token)
│   ├── _helpers.php                    ← Funções utilitárias (json_response, validação, etc.)
│   ├── login.php                       ← POST — autenticar cliente
│   ├── conta.php                       ← GET/PATCH — dados da conta
│   ├── alterar-senha.php               ← POST — trocar senha
│   ├── listar-midias.php               ← GET — listar media_assets do cliente
│   ├── enviar-midia.php                ← POST — upload de arquivo + insert no banco
│   ├── atualizar-midia.php             ← PATCH — title, is_active
│   ├── remover-midia.php               ← DELETE — remover media_asset
│   ├── listar-playlists.php            ← GET — playlists do cliente
│   ├── criar-playlist.php              ← POST — nova playlist
│   ├── ativar-playlist.php             ← PATCH — ativar uma playlist (desativa as demais)
│   ├── remover-playlist.php            ← DELETE — remover playlist + itens
│   ├── listar-itens-playlist.php       ← GET — itens de uma playlist com dados da mídia
│   ├── adicionar-item-playlist.php     ← POST — adicionar mídia à playlist
│   ├── atualizar-item-playlist.php     ← PATCH — sort_order, image_duration_ms, is_active
│   ├── remover-item-playlist.php       ← DELETE — remover item
│   ├── reordenar-itens-playlist.php    ← PUT — reordenar todos os itens
│   ├── retornar-configuracoes.php      ← GET — client_settings
│   ├── salvar-configuracoes.php        ← PATCH — atualizar settings
│   └── retornar-player-ativo.php       ← GET — settings + itens da playlist ativa (endpoint do player)
├── setup.sql                           ← Script de criação do banco (mantém o atual)
└── .htaccess                           ← Rewrite rules (opcional, para URLs limpas)
```

---

## 3) O que REMOVER do projeto atual

### 3.1 Remover completamente

| Item | Motivo |
|------|--------|
| `backend/` (toda a pasta) | Substituído pelos controladores PHP |
| `backend-php/` (se existir) | Substituído pela nova estrutura |
| `package.json` (raiz) | Não há mais npm |
| `vercel.json` | Deploy muda para servidor PHP |
| `docker-compose.yml` | Recriar se necessário para o novo stack |
| `index.php` (raiz, placeholder) | Substituído pela nova estrutura |

### 3.2 Funcionalidades Node.js que NÃO serão portadas

| Funcionalidade | Motivo |
|----------------|--------|
| `express-rate-limit` | Simplificar — sem rate limit no PHP (ou implementar básico se necessário) |
| `cors` middleware | Desnecessário — frontend e backend estão no mesmo domínio/servidor |
| `dotenv` | PHP usa variáveis diretas no `_db.php` ou um arquivo de config simples |
| `jsonwebtoken` (npm) | Reimplementar JWT simples em PHP puro (HMAC-SHA256) |
| `bcryptjs` | Substituído por `password_hash()` / `password_verify()` nativos do PHP |
| `multer` | Substituído por `$_FILES` + `move_uploaded_file()` nativos do PHP |
| `uuid` | Substituído por `bin2hex(random_bytes(16))` ou `uniqid()` |
| `mysql2` | Substituído por `PDO` nativo do PHP |

---

## 4) Controladores PHP — Especificação detalhada

### 4.1 `_db.php` — Conexão com o banco

```php
<?php
// Configuração do banco — editar valores diretamente
$DB_HOST = 'mysql.ordernaaqui.com.br';
$DB_PORT = 3306;
$DB_NAME = 'ordenaaqui11';
$DB_USER = 'ordenaaqui11';
$DB_PASS = 'StudyOlavo22';

$pdo = new PDO(
    "mysql:host=$DB_HOST;port=$DB_PORT;dbname=$DB_NAME;charset=utf8mb4",
    $DB_USER, $DB_PASS,
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);
```

### 4.2 `_helpers.php` — Utilitários

Funções:
- `json_response($data, $status = 200)` — seta header `Content-Type: application/json`, http_response_code, echo json_encode, exit.
- `json_error($message, $status = 400)` — atalho para respostas de erro.
- `get_json_body()` — lê `php://input` e decodifica JSON.
- `require_method($method)` — valida `$_SERVER['REQUEST_METHOD']`.
- `generate_uuid()` — retorna string UUID v4 simples.

### 4.3 `_auth.php` — Autenticação JWT simplificada

**Implementar JWT mínimo em PHP puro (sem bibliotecas):**

- Função `jwt_encode($payload, $secret)` — cria token HS256.
- Função `jwt_decode($token, $secret)` — verifica e decodifica.
- Função `autenticar()` — lê header `Authorization: Bearer <token>`, decodifica, retorna `['clientId' => ..., 'document' => ...]` ou responde 401.

O secret JWT fica como constante no próprio `_auth.php` ou no `_db.php`.

### 4.4 Mapeamento: Endpoints antigos → Controladores PHP

| Endpoint Node.js | Método | Controlador PHP | Observações |
|------------------|--------|-----------------|-------------|
| `POST /api/auth/login` | POST | `login.php` | `password_verify()`, gera JWT |
| `GET /api/account` | GET | `conta.php` | Retorna dados do cliente autenticado |
| `PATCH /api/account` | PATCH | `conta.php` | Atualiza `display_name` |
| `POST /api/account/change-password` | POST | `alterar-senha.php` | `password_verify()` + `password_hash()` |
| `POST /api/media` | POST | `enviar-midia.php` | `$_FILES` + `move_uploaded_file()` |
| `GET /api/media` | GET | `listar-midias.php` | SELECT por `client_id` |
| `PATCH /api/media/:id` | PATCH | `atualizar-midia.php` | `$_GET['id']` via query string ou rota |
| `DELETE /api/media/:id` | DELETE | `remover-midia.php` | `$_GET['id']` |
| `GET /api/playlists` | GET | `listar-playlists.php` | SELECT por `client_id` |
| `POST /api/playlists` | POST | `criar-playlist.php` | INSERT |
| `PATCH /api/playlists/:id/activate` | PATCH | `ativar-playlist.php` | `$_GET['id']` |
| `DELETE /api/playlists/:id` | DELETE | `remover-playlist.php` | DELETE itens + playlist |
| `GET /api/playlists/:id/items` | GET | `listar-itens-playlist.php` | JOIN com `media_assets` |
| `POST /api/playlists/:id/items` | POST | `adicionar-item-playlist.php` | `$_GET['playlist_id']` |
| `PATCH /api/playlists/:id/items/:itemId` | PATCH | `atualizar-item-playlist.php` | `$_GET['id']` + `$_GET['item_id']` |
| `DELETE /api/playlists/:id/items/:itemId` | DELETE | `remover-item-playlist.php` | `$_GET['id']` + `$_GET['item_id']` |
| `PUT /api/playlists/:id/items/reorder` | PUT | `reordenar-itens-playlist.php` | Body JSON com array `items` |
| `GET /api/settings` | GET | `retornar-configuracoes.php` | Auto-insere default se não existir |
| `PATCH /api/settings` | PATCH | `salvar-configuracoes.php` | Valida `transition_type` |
| `GET /api/player/active` | GET | `retornar-player-ativo.php` | Query complexa: settings + playlist ativa |

### 4.5 Passagem de parâmetros (IDs)

Como não teremos um roteador sofisticado, os IDs serão passados via **query string**:

```
controladores/atualizar-midia.php?id=5
controladores/listar-itens-playlist.php?id=3
controladores/atualizar-item-playlist.php?id=3&item_id=12
```

### 4.6 Middleware / Autenticação

**Abordagem simplificada:** Cada controlador que exige autenticação inclui no topo:

```php
<?php
require_once __DIR__ . '/_db.php';
require_once __DIR__ . '/_helpers.php';
require_once __DIR__ . '/_auth.php';

$cliente = autenticar(); // retorna dados ou responde 401
$clientId = $cliente['clientId'];
```

Não há middleware separado em cadeia. Apenas o `login.php` não chama `autenticar()`.

### 4.7 Upload de mídia (`enviar-midia.php`)

- Usa `$_FILES['file']` nativo.
- Validação de MIME types permitidos: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `video/mp4`, `video/webm`, `video/ogg`.
- Limite de tamanho controlado pelo `php.ini` (`upload_max_filesize`, `post_max_size`) — configurar no `.htaccess` ou `php.ini`.
- Nome do arquivo: `bin2hex(random_bytes(16))` + extensão original.
- Destino: `../uploads/`.
- Grava no banco: `INSERT INTO media_assets (...)`.
- Retorna o registro criado como JSON.

### 4.8 CORS

**Não necessário.** Frontend e controladores PHP estarão no mesmo domínio. Se futuramente precisar, basta adicionar headers no `_helpers.php`:

```php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
```

---

## 5) Frontend — `assets/js/app.js`

### 5.1 O que extrair do `<script>` inline do `index.html`

Todo o bloco `<script>` (linhas ~588–1402 do `index.html` atual) será movido para `assets/js/app.js`.

### 5.2 Alterações necessárias no JS

| Item | Antes (Node.js) | Depois (PHP) |
|------|-----------------|--------------|
| Base URL da API | `http://localhost:3001/api` | Relativo: `./controladores` |
| Chamadas `api()` | `fetch(API + '/media')` | `fetch('./controladores/listar-midias.php')` |
| Upload XHR | `API + '/media'` | `'./controladores/enviar-midia.php'` |
| URL das mídias | `API.replace('/api','') + file_url` | Relativo: `'.' + file_url` (ex: `./uploads/xxx.jpg`) |
| IDs em rotas REST | `/media/${id}` | `?id=${id}` como query string |

### 5.3 Função `api()` reescrita

```javascript
const API_BASE = './controladores';

async function api(method, endpoint, body, isFormData = false) {
  const headers = {};
  if (token) headers['Authorization'] = 'Bearer ' + token;
  if (!isFormData && body) headers['Content-Type'] = 'application/json';

  const res = await fetch(API_BASE + endpoint, {
    method,
    headers,
    body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erro na requisição');
  return data;
}
```

### 5.4 Mapeamento de chamadas JS → controladores PHP

| Chamada JS atual | Nova chamada |
|------------------|--------------|
| `api('POST', '/auth/login', {...})` | `api('POST', '/login.php', {...})` |
| `api('GET', '/media')` | `api('GET', '/listar-midias.php')` |
| `api('PATCH', '/media/${id}', {...})` | `api('PATCH', '/atualizar-midia.php?id=${id}', {...})` |
| `api('DELETE', '/media/${id}')` | `api('DELETE', '/remover-midia.php?id=${id}')` |
| XHR `POST API + '/media'` | XHR `POST API_BASE + '/enviar-midia.php'` |
| `api('GET', '/playlists')` | `api('GET', '/listar-playlists.php')` |
| `api('POST', '/playlists', {...})` | `api('POST', '/criar-playlist.php', {...})` |
| `api('PATCH', '/playlists/${id}/activate')` | `api('PATCH', '/ativar-playlist.php?id=${id}')` |
| `api('DELETE', '/playlists/${id}')` | `api('DELETE', '/remover-playlist.php?id=${id}')` |
| `api('GET', '/playlists/${id}/items')` | `api('GET', '/listar-itens-playlist.php?id=${id}')` |
| `api('POST', '/playlists/${id}/items', {...})` | `api('POST', '/adicionar-item-playlist.php?id=${id}', {...})` |
| `api('PATCH', '/playlists/${id}/items/${itemId}', {...})` | `api('PATCH', '/atualizar-item-playlist.php?id=${id}&item_id=${itemId}', {...})` |
| `api('DELETE', '/playlists/${id}/items/${itemId}')` | `api('DELETE', '/remover-item-playlist.php?id=${id}&item_id=${itemId}')` |
| `api('PUT', '/playlists/${id}/items/reorder', {...})` | `api('PUT', '/reordenar-itens-playlist.php?id=${id}', {...})` |
| `api('GET', '/settings')` | `api('GET', '/retornar-configuracoes.php')` |
| `api('PATCH', '/settings', {...})` | `api('PATCH', '/salvar-configuracoes.php', {...})` |
| `api('GET', '/player/active')` | `api('GET', '/retornar-player-ativo.php')` |
| `api('GET', '/account')` | `api('GET', '/conta.php')` |
| `api('PATCH', '/account', {...})` | `api('PATCH', '/conta.php', {...})` |
| `api('POST', '/account/change-password', {...})` | `api('POST', '/alterar-senha.php', {...})` |

### 5.5 URLs de mídias no player e grid

Antes:
```javascript
const src = item.file_url.startsWith('http') ? item.file_url : API.replace('/api', '') + item.file_url;
```

Depois:
```javascript
const src = item.file_url.startsWith('http') ? item.file_url : '.' + item.file_url;
```

Como `file_url` salvo no banco é `/uploads/xxx.jpg`, o resultado será `./uploads/xxx.jpg` — caminho relativo correto.

### 5.6 Funcionalidades JS mantidas sem alteração

Toda a lógica de UI permanece idêntica:
- Toast notifications
- Modal open/close
- Player (slides, transições, vídeo, progresso, fullscreen)
- Drag and drop da playlist
- CPF/CNPJ mask
- Login/logout flow
- localStorage (token, client, remember_page)
- Formatação (bytes, documento)

---

## 6) Alterações no `index.html`

### 6.1 Remover

- Todo o bloco `<script>...</script>` inline (linhas ~588–1402).

### 6.2 Adicionar

No final do `<body>`, antes de `</body>`:

```html
<script src="./assets/js/app.js"></script>
```

### 6.3 Manter

- Todo o HTML (estrutura de páginas, modais).
- Todo o CSS inline no `<style>`.

---

## 7) Banco de dados

### 7.1 Schema — sem alterações

As tabelas permanecem idênticas ao `setup.sql` atual:
- `clients`
- `media_assets`
- `playlists`
- `playlist_items`
- `client_settings`

### 7.2 Criação de clientes

Sem o `setup-db.js`, criar um script PHP simples (opcional) ou inserir manualmente via SQL:

```sql
INSERT INTO clients (document, display_name, password_hash)
VALUES ('12345678901', 'Nome do Cliente', '$2y$12$...');
```

A senha hash pode ser gerada com:

```php
echo password_hash('senha123', PASSWORD_BCRYPT);
```

---

## 8) Autenticação JWT em PHP puro

Implementação mínima usando HMAC-SHA256 (sem bibliotecas):

```
Header:  {"alg":"HS256","typ":"JWT"}
Payload: {"clientId":1,"document":"12345678901","exp":1234567890}
```

- `jwt_encode($payload, $secret)` — base64url(header) . base64url(payload) . base64url(hmac_sha256(header.payload, secret))
- `jwt_decode($token, $secret)` — split, verificar assinatura, verificar `exp`, retornar payload.
- Expiração: 8 horas (configurável como constante).

---

## 9) Checklist de implementação

### Fase 1 — Infraestrutura PHP

- [ ] Criar `controladores/_db.php` com conexão PDO
- [ ] Criar `controladores/_helpers.php` com funções utilitárias
- [ ] Criar `controladores/_auth.php` com JWT simplificado
- [ ] Criar pasta `uploads/` com permissões de escrita

### Fase 2 — Controladores de autenticação e conta

- [ ] `login.php` — login com `password_verify()` + JWT
- [ ] `conta.php` — GET e PATCH dados do cliente
- [ ] `alterar-senha.php` — trocar senha

### Fase 3 — Controladores de mídia

- [ ] `listar-midias.php` — SELECT media_assets
- [ ] `enviar-midia.php` — upload + INSERT
- [ ] `atualizar-midia.php` — UPDATE title/is_active
- [ ] `remover-midia.php` — DELETE

### Fase 4 — Controladores de playlist

- [ ] `listar-playlists.php` — SELECT playlists
- [ ] `criar-playlist.php` — INSERT
- [ ] `ativar-playlist.php` — UPDATE ativar/desativar
- [ ] `remover-playlist.php` — DELETE itens + playlist
- [ ] `listar-itens-playlist.php` — SELECT com JOIN media_assets
- [ ] `adicionar-item-playlist.php` — INSERT item
- [ ] `atualizar-item-playlist.php` — UPDATE item
- [ ] `remover-item-playlist.php` — DELETE item
- [ ] `reordenar-itens-playlist.php` — UPDATE sort_order em lote

### Fase 5 — Controladores de configurações e player

- [ ] `retornar-configuracoes.php` — GET (auto-insert default)
- [ ] `salvar-configuracoes.php` — PATCH
- [ ] `retornar-player-ativo.php` — GET settings + itens ativos

### Fase 6 — Frontend

- [ ] Criar `assets/js/app.js` com JS extraído do `index.html`
- [ ] Atualizar todas as chamadas de API para os novos endpoints PHP
- [ ] Atualizar URLs de mídia para caminhos relativos
- [ ] Atualizar `index.html`: remover `<script>` inline, adicionar `<script src>`
- [ ] Mover `index.html` para a raiz do projeto (se não estiver)

### Fase 7 — Limpeza

- [ ] Remover `backend/`
- [ ] Remover `backend-php/`
- [ ] Remover `package.json` da raiz
- [ ] Remover `vercel.json`
- [ ] Atualizar README

---

## 10) Resumo das tecnologias

| Camada | Antes | Depois |
|--------|-------|--------|
| Backend runtime | Node.js + Express | PHP nativo (7.4+) |
| Banco de dados | mysql2 (npm) | PDO (nativo PHP) |
| Autenticação | jsonwebtoken (npm) | JWT manual (HMAC-SHA256) |
| Hash de senha | bcryptjs (npm) | `password_hash()` / `password_verify()` (nativo) |
| Upload | multer (npm) | `$_FILES` + `move_uploaded_file()` (nativo) |
| UUID | uuid (npm) | `bin2hex(random_bytes(16))` (nativo) |
| CORS | cors (npm) | Desnecessário (mesmo domínio) |
| Rate limit | express-rate-limit (npm) | Removido (simplificado) |
| Frontend JS | Inline no HTML | `assets/js/app.js` (arquivo separado) |
| Deploy | Vercel + Railway | Qualquer servidor com PHP + MySQL |

---
