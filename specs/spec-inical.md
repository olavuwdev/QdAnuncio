Abaixo vai um **SPEC (especificação funcional + técnica)** do sistema e, em seguida, os **scripts MySQL** (CREATE TABLE + exemplos de INSERT/UPDATE/SELECT) para suportar: login por CPF/CNPJ, upload/registro de mídias (imagem/vídeo), configuração de tempo por imagem, ordem da playlist e retorno do que deve tocar em tela cheia.

---

## 1) Visão geral do produto

### Problema

Ter um **local na web** onde, todos os dias, você possa **subir/trocar imagens e vídeos** e exibir isso em uma **TV** como propaganda, em **tela cheia**, com **transições/animações** e **tempo configurável** por slide.

### Objetivo

* Um **painel web** para administrar mídias e configurações.
* Uma **tela de exibição (OFERTAS)** em fullscreen que roda em loop, com imagens/vídeos.
* Um **login por CPF/CNPJ + senha**, pois o sistema será multi-cliente.

---

## 2) Perfis / papéis

### Cliente (Tenant)

* Cada cliente é identificado por **CPF ou CNPJ** (um único “documento”).
* Possui suas mídias, playlists e configurações isoladas de outros clientes.

### Usuários (simplificado)

* Para começar, pode existir **1 usuário por cliente** (o próprio cliente).
* Evolução: múltiplos usuários por cliente com permissões (admin/operador).

---

## 3) Fluxo de telas

### 3.1 Tela 1: Login

**Campos:**

* CPF/CNPJ
* Senha

**Regras:**

* Bloquear após N tentativas (ex.: 10 minutos).
* Senha sempre armazenada como **hash** (bcrypt/argon2) — nunca texto puro.

### 3.2 Tela 2: Menu principal

Após login, mostrar 2 botões grandes:

* **OFERTAS**
* **ADMINISTRAR**

### 3.3 Tela: OFERTAS (Player / Exibição)

* Abre em **tela cheia**.
* Roda a “playlist ativa” do cliente:

  * **Imagens**: exibir por `duration_ms` (configurável por item).
  * **Vídeos**: tocar até o fim (ou opcionalmente permitir cortar por duração).
* **Transição** entre slides: fade / slide / zoom (configurável).
* Repetição: loop infinito.
* Deve funcionar bem em TV/PC/Chromecast (navegador).

**Comportamentos importantes**

* Pré-carregar próxima mídia para evitar tela preta.
* Se uma mídia falhar (arquivo indisponível), pular e registrar log.

### 3.4 Tela: ADMINISTRAR (Painel)

Módulos mínimos:

1. **Arquivos / Mídias**

* Upload de imagem/vídeo
* Listagem com miniatura, tipo, tamanho, status
* Ativar/desativar mídia

2. **Playlist (o que aparece em OFERTAS)**

* Selecionar quais mídias entram
* Ordenar itens (drag-and-drop)
* Definir tempo para cada imagem
* (Opcional) agrupar por “campanhas” ou “períodos”

3. **Configurações do Player**

* Tipo de transição (fade/slide/zoom)
* Duração da transição
* Se vídeos entram com áudio ou mudo
* Modo “sempre fullscreen”
* (Opcional) horário de funcionamento (ex.: só 08:00–20:00)

4. **Conta**

* Trocar senha
* Dados do cliente (nome fantasia, etc.)

---

## 4) Requisitos não funcionais (recomendados)

* **Multi-tenant**: todo dado amarrado ao `client_id`.
* Upload de mídia:

  * Armazenamento recomendado: **S3/MinIO** (ou storage local com backup).
  * No banco, guardar apenas **metadados + URL/caminho**.
* Segurança:

  * JWT ou sessão server-side
  * Hash de senha (bcrypt/argon2)
  * Rate limit no login
* Performance:

  * Player deve ter endpoint leve para “buscar playlist ativa”
  * Cache por cliente (opcional)
* Compatibilidade:

  * Player em SPA (React/Vue) ou página simples com JS.
  * Admin responsivo.

---

## 5) Modelo de dados (MySQL)

CONECTAR AO BANCO DE DADOS
host: http://mysql.ordenaaqui.com.br
user: ordenaaqui11
database: ordenaaqui11
senha: StudyOlavo1

Entidades principais:

* `clients` (clientes / tenants) — CPF/CNPJ + senha_hash
* `media_assets` (imagens e vídeos)
* `playlists` (ex.: “principal”)
* `playlist_items` (itens ordenados: mídia + duração da imagem + ordem)
* `client_settings` (configurações do player por cliente)

---

# 6) MySQL — ESTRUTURA


## 🧾 clients

```sql
CREATE TABLE clients (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  document VARCHAR(14) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_clients_document (document)
);
```

---

## 🖼️ media_assets

```sql
CREATE TABLE media_assets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id BIGINT UNSIGNED NOT NULL,
  media_type ENUM('IMAGE','VIDEO') NOT NULL,
  title VARCHAR(160),
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(1000) NOT NULL,
  mime_type VARCHAR(120),
  file_size_bytes BIGINT UNSIGNED,
  width_px INT UNSIGNED,
  height_px INT UNSIGNED,
  duration_ms INT UNSIGNED,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_media_client (client_id)
);
```

---

## 📺 playlists

```sql
CREATE TABLE playlists (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  is_active TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_playlist_client (client_id)
);
```

---

## 🎞️ playlist_items

```sql
CREATE TABLE playlist_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  playlist_id BIGINT UNSIGNED NOT NULL,
  media_id BIGINT UNSIGNED NOT NULL,
  sort_order INT NOT NULL,
  image_duration_ms INT UNSIGNED,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_playlist (playlist_id),
  KEY idx_media (media_id)
);
```

---

## ⚙️ client_settings

```sql
CREATE TABLE client_settings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id BIGINT UNSIGNED NOT NULL,
  transition_type ENUM('FADE','SLIDE','ZOOM') DEFAULT 'FADE',
  transition_duration_ms INT UNSIGNED DEFAULT 600,
  default_image_duration_ms INT UNSIGNED DEFAULT 7000,
  mute_videos TINYINT(1) DEFAULT 1,
  fullscreen_mode TINYINT(1) DEFAULT 1,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_settings_client (client_id)
);
```

## 6.2 INSERT — Inserir mídia (imagem/vídeo)

> Observação: normalmente o upload salva o arquivo no storage e depois grava no banco.

📥 INSERT EXEMPLOS
Criar cliente
INSERT INTO clients (document, display_name, password_hash)
VALUES ('12345678000199', 'Cliente Exemplo', 'hash_da_senha');
Criar configuração padrão
INSERT INTO client_settings (client_id)
VALUES (1);
Criar playlist
INSERT INTO playlists (client_id, name, is_active)
VALUES (1, 'Principal', 1);
Inserir IMAGEM
INSERT INTO media_assets (
  client_id,
  media_type,
  title,
  file_name,
  file_url,
  mime_type,
  width_px,
  height_px
)
VALUES (
  1,
  'IMAGE',
  'Promoção Segunda',
  'promo.jpg',
  'https://cdn.site.com/promo.jpg',
  'image/jpeg',
  1920,
  1080
);
Inserir VÍDEO
INSERT INTO media_assets (
  client_id,
  media_type,
  title,
  file_name,
  file_url,
  mime_type,
  duration_ms
)
VALUES (
  1,
  'VIDEO',
  'Vídeo Principal',
  'video.mp4',
  'https://cdn.site.com/video.mp4',
  'video/mp4',
  30000
);
Adicionar mídia na playlist
INSERT INTO playlist_items (
  playlist_id,
  media_id,
  sort_order,
  image_duration_ms
)
VALUES (1, 1, 1, 8000);
🔄 UPDATE
Alterar tempo da imagem
UPDATE playlist_items
SET image_duration_ms = 10000
WHERE playlist_id = 1
AND media_id = 1;
Alterar configurações do player
UPDATE client_settings
SET
  transition_type = 'SLIDE',
  transition_duration_ms = 900,
  default_image_duration_ms = 6000
WHERE client_id = 1;
📤 SELECT PARA PLAYER (OFERTAS)
Buscar configurações
SELECT *
FROM client_settings
WHERE client_id = 1;
Buscar playlist ativa com mídias
SELECT
  ma.id AS media_id,
  ma.media_type,
  ma.title,
  ma.file_url,
  ma.mime_type,
  ma.width_px,
  ma.height_px,
  ma.duration_ms AS video_duration_ms,
  pi.sort_order,
  CASE
    WHEN ma.media_type = 'IMAGE'
      THEN COALESCE(pi.image_duration_ms, cs.default_image_duration_ms)
    ELSE NULL
  END AS image_duration_ms_effective
FROM playlists p
JOIN playlist_items pi ON pi.playlist_id = p.id
JOIN media_assets ma ON ma.id = pi.media_id
JOIN client_settings cs ON cs.client_id = p.client_id
WHERE p.client_id = 1
AND p.is_active = 1
AND pi.is_active = 1
AND ma.is_active = 1
ORDER BY pi.sort_order ASC;
`

---

## 7) Endpoints recomendados (API) — para orientar o desenvolvimento

### Auth

* `POST /api/auth/login` (document, password) → token/sessão
* `POST /api/auth/logout`

### Admin

* `POST /api/media` (upload) → cria `media_assets`

* `GET /api/media` (lista)

* `PATCH /api/media/:id` (title, is_active, etc.)

* `GET /api/playlists` / `POST /api/playlists`

* `PATCH /api/playlists/:id/activate`

* `POST /api/playlists/:id/items` (media_id, sort_order, image_duration_ms)

* `PATCH /api/playlists/:id/items/:itemId` (sort_order, image_duration_ms, is_active)

* `GET /api/settings`

* `PATCH /api/settings`

### Player

* `GET /api/player/active` → retorna settings + itens (o SELECT acima)

---
