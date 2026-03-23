# Deploy do QdAnuncio na Vercel

O projeto tem **frontend** (estático) e **backend** (Node.js + Express + MySQL). A Vercel hospeda bem o frontend, mas o backend precisa ficar em outro serviço (Railway ou Render).

## Visão geral

- **Frontend** → Vercel (HTML/CSS/JS)
- **Backend** → Railway ou Render (API + uploads)
- **Banco** → MySQL externo (já configurado em `backend/.env`)

## Passo 1: Deploy do Backend (Railway)

1. Crie uma conta em [railway.app](https://railway.app)
2. **New Project** → **Deploy from GitHub** e conecte o repositório
3. Na configuração do serviço:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Em **Variables**, adicione as mesmas variáveis do seu `backend/.env`:
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
   - `JWT_SECRET` (use uma chave forte em produção)
   - `JWT_EXPIRES_IN`, `MAX_FILE_SIZE_MB`
5. Após o deploy, anote a URL do backend (ex: `https://qdanuncio-production.up.railway.app`)

> **Uploads**: O Railway usa disco efêmero. Arquivos enviados somem quando o app reinicia. Para persistência, use **Volumes** no Railway ou migre para S3/Vercel Blob.

## Passo 2: Atualizar `vercel.json`

Edite `vercel.json` e substitua `SEU-BACKEND-URL` pela URL real do backend (sem `https://`):

```json
"destination": "https://qdanuncio-production.up.railway.app/api/:path*"
```

Faça o mesmo para a rota `/uploads`:

```json
"destination": "https://qdanuncio-production.up.railway.app/uploads/:path*"
```

## Passo 3: Deploy do Frontend na Vercel

1. Crie uma conta em [vercel.com](https://vercel.com)
2. **Add New Project** → importe o repositório do GitHub
3. Configuração:
   - **Framework Preset**: Other
   - **Root Directory**: (deixe em branco, raiz do projeto)
   - **Build Command**: (deixe vazio)
   - **Output Directory**: será lido do `vercel.json`
4. Clique em **Deploy**

O `vercel.json` já está configurado para:
- Servir os arquivos da pasta `frontend`
- Redirecionar `/api/*` e `/uploads/*` para o backend no Railway

## Passo 4: Banco de dados

Se o MySQL não tiver acesso remoto liberado, configure o IP do Railway na lista de hosts permitidos. No Railway, o IP pode variar; considere usar um banco com acesso público (ex: PlanetScale, Railway MySQL) em produção.

## Checklist

- [ ] Backend deployado no Railway
- [ ] Variáveis de ambiente configuradas no Railway
- [ ] `vercel.json` atualizado com a URL do backend
- [ ] Frontend deployado na Vercel
- [ ] Teste de login e upload de mídia
