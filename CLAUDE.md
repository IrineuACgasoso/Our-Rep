# CLAUDE.md

Guia de arquitetura para quem (humano ou IA) for trabalhar neste repositório.

## Visão geral

App PWA privado para um casal, com login restrito por e-mail (Google), usado para
organizar presentes, restaurantes, viagens e receitas em conjunto. Sem build step:
HTML/CSS/JS puro carregado direto pelo navegador, com Firebase (Auth + Realtime
Database) como backend, e Service Worker para funcionar como PWA instalável.

- **Hosting:** Vercel (`our-rep.vercel.app`), estático — sem framework, sem bundler.
- **Backend:** Firebase (projeto `present-list-98062`)
  - **Auth:** Google Sign-In, restrito a 3 e-mails fixos.
  - **Realtime Database:** toda a persistência de dados do app.
- **Sem servidor próprio.** Todo o "backend" é regras de segurança do Firebase +
  chamadas diretas do client ao SDK do Firebase.

## Estrutura de arquivos

```
index.html              shell da SPA: login, header, nav, 4 painéis vazios
manifest.json            metadata do PWA (ícone, cor, display standalone)
sw.js                    Service Worker: cache-first dos assets estáticos
vercel.json               rewrite de /__/auth/* para o authDomain do Firebase
css/
  base.css               reset, layout do shell, paleta de cores por seção (CSS vars)
  gifts.css               estilos específicos da aba Presentes
  restaurants.css         estilos específicos da aba Restaurantes (+ mapa Leaflet)
  travels.css              estilos específicos da aba Viagens
  recipes.css              estilos específicos da aba Receitas
sections/
  gifts.html               HTML parcial injetado no painel de Presentes
  restaurants.html          HTML parcial injetado no painel de Restaurantes
  travels.html               HTML parcial injetado no painel de Viagens
  recipes.html                HTML parcial injetado no painel de Receitas
js/
  app.js                   bootstrap, roteamento entre seções, listeners do DB
  firebase.js               config do Firebase, export de db/auth/provider/ALLOWED
  auth.js                    login/logout via Google (signInWithRedirect)
  state.js                   estado global compartilhado entre módulos
  gifts.js                    lógica da aba Presentes
  restaurants.js               lógica da aba Restaurantes (+ integração com mapa)
  travels.js                    lógica da aba Viagens (destinos > categorias > itens)
  recipes.js                     lógica da aba Receitas
  utils.js                        helpers puros (toast, escape HTML, compressão de imagem, etc.)
```

Não há `package.json`, bundler, transpilação ou testes automatizados. Tudo roda
como ES Modules nativos do navegador (`<script type="module">`), incluindo os SDKs
do Firebase, importados direto de URLs do `gstatic.com`.

## Modelo mental do app

### 1. Uma SPA de 4 seções, sem router

`index.html` define 4 `<div class="section-panel">` vazios. No boot, `app.js`
busca (`fetch`) o HTML de cada `sections/*.html` e injeta como `innerHTML` de cada
painel. Trocar de aba (`setSection()`) apenas troca classes `active`/atributo
`data-section` e chama a função de render correspondente — não há navegação de
verdade, nem URL mudando por seção.

Não há biblioteca de front-end nenhuma (sem React/Vue/etc). Toda renderização é
`innerHTML` com template strings + `querySelectorAll` + `addEventListener` manual,
repetido em cada módulo de seção.

### 2. Estado global centralizado em `state.js`

Um único objeto `state` (não reativo, sem proxy/observer) guarda tudo que precisa
ser lido entre módulos: aba ativa, dados vindos do Firebase por seção, rascunhos de
formulários em edição, cache de geocoding, referência do mapa Leaflet, etc. Os
módulos leem/escrevem esse objeto diretamente e chamam manualmente a função de
render depois de qualquer mudança — não existe binding automático.

### 3. Sincronização em tempo real via Firebase Realtime Database

`app.js#startListeners()` registra `onValue()` para cada nó relevante do banco
(`gifts/mine`, `gifts/hers`, `restaurants`, `restTags`, `travels`, `recipes`).
Cada listener atualiza o `state` correspondente e, **se a seção afetada estiver
ativa na tela**, dispara o re-render daquela seção. Isso é o que faz o app
funcionar como "compartilhado ao vivo" entre os dois usuários — qualquer escrita
de um lado aparece automaticamente pro outro sem F5.

Os listeners só começam depois de autenticado (`initAuth(startListeners)`), e só
uma vez (`listenersStarted` guarda contra registro duplicado).

### 4. Autenticação: Google Sign-In restrito por e-mail, checado 2x

- **Client-side (`auth.js`):** `onAuthStateChanged` verifica se o e-mail logado
  está na lista `ALLOWED` (em `firebase.js`). Se não estiver, desloga na hora e
  mostra "Acesso negado". Isso é só UX — não é segurança de verdade.
- **Server-side (Realtime Database Rules):** as regras publicadas no Firebase
  Console devem replicar essa mesma checagem (`auth.token.email` contra a lista),
  porque client-side sozinho não impede ninguém de ler/escrever direto na API do
  Realtime Database.

Login usa `signInWithRedirect` (não popup) — decisão tomada especificamente
porque Safari/iOS bloqueia o storage compartilhado necessário para popups e,
sem cuidado extra, também para redirects entre domínios diferentes (ver seção
"Pegadinha de auth cross-domain" abaixo).

### 5. Cada seção segue o mesmo padrão de módulo

Praticamente todo `js/<secao>.js` repete a mesma receita:

1. `init<Secao>()` — chamado uma vez no boot, liga listeners de clique/input nos
   elementos estáticos do formulário de "adicionar".
2. `render<Secao>()` / `render<Secao>Grid()` — reconstrói o HTML da lista a partir
   de `state.<secao>Data`, sempre via `escH()` para evitar XSS básico, e re-liga
   os event listeners dos itens recém-criados (porque `innerHTML` destrói os
   antigos).
3. Editor inline — abrir edição injeta um `<div class="inline-editor">` dentro do
   próprio card, sem modal; salvar/cancelar remove esse div.
4. Toda escrita no banco é `push`/`update`/`remove` do SDK do Firebase, com
   `try/catch` simples mostrando toast de erro.

Exceção mais rica: **Viagens** tem uma view de detalhe separada (lista de destinos
→ clique abre detalhe full-page com categorias fixas de `state.js#TRAVEL_CATS`:
culinária, passeios, atrações, hospedagem), e permite vincular um restaurante já
cadastrado à categoria "culinária" de uma viagem (comunicação entre os módulos
`travels.js` e `restaurants.js` via `state.pendingTravelRestaurant`).

**Receitas** segue o mesmo padrão de "lista ⇄ detalhe" de Viagens: abrir uma
receita esconde a lista inteira (`recipesListView` → `recipeDetailView`), em vez
de expandir o card no próprio grid.

### 6. Navegação com o botão físico/gestual de voltar (Android)

Como é uma SPA sem `pushState`, o botão voltar do Android naturalmente fecharia o
app assim que qualquer "tela interna" (detalhe de viagem, detalhe de receita)
estivesse aberta — porque não existe histórico de navegação real para o navegador
voltar. Isso foi resolvido com um helper dedicado:

- **`js/navstack.js`**: pilha simples de "views abertas". `pushView(id, onClose)`
  é chamado ao abrir uma view de detalhe e cria uma entrada fake de histórico
  (`history.pushState`). Um listener único de `popstate` desempilha e chama
  `onClose()` — fechando a view internamente em vez de deixar o navegador (e o
  botão físico do Android) sair do app. `popView(id)` é chamado quando o próprio
  usuário fecha a view por um botão dentro do app (evita duplo-fechamento).
  Aplicado hoje em `travel-detail` e `recipe-detail`; deliberadamente **não**
  aplicado a editores inline menores, para não "picotar" o botão voltar em
  excesso.

### 7. Service Worker / PWA

`sw.js` implementa cache "stale-while-revalidate" simplificado: serve do cache
imediatamente se existir, atualiza o cache em paralelo com o resultado da rede.
O nome da constante `CACHE` (`nosso-app-vN`) é o mecanismo de invalidação — mudar
esse valor força os clientes a descartarem o cache antigo e buscar tudo de novo.
**Isso já causou um bug real:** ter duas declarações `const CACHE = ...` no mesmo
arquivo quebra o `sw.js` inteiro com `SyntaxError`, e como falhas de Service
Worker são silenciosas, o app continua servindo a versão cacheada antiga
indefinidamente até o usuário limpar dados do site manualmente. **Sempre que
mudar algo em `js/`, `css/` ou `sections/`, bump a versão de `CACHE` em `sw.js`.**

### 8. Pegadinha conhecida: auth cross-domain no Safari/iOS

O `authDomain` do Firebase por padrão é `<projeto>.firebaseapp.com`. Quando o site
é servido de um domínio diferente (aqui, `our-rep.vercel.app`), o handshake do
Firebase Auth depende de armazenamento compartilhado entre esses dois domínios —
algo que o Safari/iOS bloqueia agressivamente por padrão (ITP / "Prevent
Cross-Site Tracking"), quebrando login tanto via popup quanto via redirect com
erros como "missing initial state" / "storage-partitioned browser environment".

A correção aplicada, **sem abandonar o Vercel**, foi:
1. `vercel.json` na raiz fazendo rewrite de `/__/auth/*` para
   `https://present-list-98062.firebaseapp.com/__/auth/*` (proxy reverso — faz o
   navegador enxergar tudo como mesma origem).
2. `authDomain` em `firebase.js` trocado de `present-list-98062.firebaseapp.com`
   para `our-rep.vercel.app` (o próprio domínio do site).
3. `our-rep.vercel.app` adicionado em Firebase Console → Authentication →
   Settings → Authorized domains.

Se no futuro o domínio do Vercel mudar (ex: domínio customizado), os 3 pontos
acima precisam ser atualizados juntos, ou o login volta a quebrar do mesmo jeito.

## Convenções ao editar este projeto

- **Sem build step.** Qualquer JS novo tem que rodar direto no navegador como
  ES Module — sem TypeScript, sem JSX, sem import de pacotes npm locais (só CDNs
  externas via URL completa, como já é feito com Firebase e Leaflet).
- **`escH()` sempre** ao interpolar dados vindos do usuário/banco dentro de
  `innerHTML`, para evitar XSS. Já é seguido consistentemente em todos os módulos.
- **Imagens são salvas como base64 inline** no Realtime Database (via
  `compressImage()` em `utils.js`, que redimensiona e comprime antes de gerar o
  data URL). Não há Firebase Storage/bucket sendo usado para isso — atenção ao
  tamanho, porque nós do Realtime Database têm limite de payload.
- **Toda seção nova segue o padrão**: `state.js` (novo campo de dados) → CSS
  próprio com paleta via `[data-section="..."]` → `sections/<nome>.html` →
  `js/<nome>.js` (init/render/CRUD) → registrar em `SECTIONS`, `loadSections()`,
  `setSection()` e `startListeners()` em `app.js` → adicionar botão de nav e painel
  em `index.html` → adicionar arquivos novos em `ASSETS` e bump de `CACHE` em
  `sw.js`.
- **Regras de segurança do Realtime Database** vivem só no Firebase Console, fora
  deste repositório — não há arquivo `database.rules.json` versionado aqui ainda.
  Vale considerar adicionar um, para que as regras fiquem sob controle de versão
  junto com o resto do projeto.