# Nossa Lista de Coisas

App React (Vite) para presentes, restaurantes, viagens e receitas, com Firebase
(Auth + Realtime Database) como backend.

## Como rodar localmente

1. **Instale as dependências** (precisa de Node 18+):
   ```bash
   npm install
   ```

2. **Configure o Firebase**: copie `.env.example` para `.env` e preencha com os valores
   do seu projeto Firebase (Firebase Console → Configurações do projeto → Seus apps →
   SDK setup and configuration):
   ```bash
   cp .env.example .env
   ```
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_DATABASE_URL=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
   O `.env` nunca é commitado (já está no `.gitignore`).

3. **Rode o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Abre em `http://localhost:5173`.

4. **Login**: só e-mails na lista `ALLOWED` (em `src/firebase/firebase.js`) conseguem
   entrar. Ajuste essa lista para os e-mails do seu caso de uso.

## Build de produção

```bash
npm run build      # gera dist/
npm run preview    # serve o build localmente, pra conferir antes do deploy
```

## Deploy

O projeto já vem com `vercel.json` (rewrite de `/__/auth/*` pro domínio de auth do
Firebase, necessário pro login funcionar em produção). Basta conectar o repositório
na Vercel — ela detecta o Vite automaticamente (`npm run build`, saída em `dist/`).
Configure as mesmas variáveis de ambiente do `.env` nas configurações do projeto na
Vercel (Settings → Environment Variables).

## Antes de ir pra produção

- Adicione os ícones do PWA em `public/` (veja "Pendências conhecidas" no `CLAUDE.md`) —
  sem eles o manifest/favicons apontam para arquivos inexistentes.
- Confirme as regras de segurança do Realtime Database no Firebase Console — a lista
  `ALLOWED` no client é só UX, a segurança de verdade é nas Database Rules.