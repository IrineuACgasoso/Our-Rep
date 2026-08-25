# CLAUDE.md

Guia de arquitetura para quem (humano ou IA) for trabalhar neste repositório.

## Visão geral

App PWA privado para um casal, com login restrito por e-mail (Google), usado para
organizar presentes, restaurantes, viagens e receitas em conjunto.

Este projeto foi migrado de HTML/CSS/JS puro (sem build) para **React 19 + Vite**.
O CSS original foi mantido praticamente intacto (mesmas classes, mesmas variáveis) —
a migração trocou a forma como o DOM é gerado (de manipulação manual/`innerHTML` para
JSX declarativo), não o visual.

- **Hosting:** Vercel, agora como build estático gerado pelo Vite (`vite build` → `dist/`).
- **Backend:** Firebase (Auth + Realtime Database), inalterado.
  - **Auth:** Google Sign-In (redirect), restrito a e-mails fixos em `ALLOWED`.
  - **Realtime Database:** toda a persistência de dados do app.
- **Sem servidor próprio.** Todo "backend" é regras de segurança do Firebase +
  chamadas diretas do client ao SDK do Firebase.

## O que mudou na migração

- **Config do Firebase agora vem de variáveis de ambiente** (`.env`, não commitado) em vez
  de estar hardcoded no bundle. Veja `.env.example`.
- **Estado global** (dados em tempo real do Firebase + sessão do usuário + navegação entre
  seções) centralizado em `AppContext` (substitui `state.js` + os listeners soltos de `app.js`).
- **Toasts** centralizados em `ToastContext` (substitui `showToast()` solto em `utils.js`).
- **Lógica de UI repetida foi encapsulada em componentes reutilizáveis**, por exemplo:
  - `ImageDropzone` — consolida ~6 handlers quase idênticos de drag/drop/paste/upload de
    imagem que existiam espalhados em `gifts.js`, `recipes.js` e `travels.js`.
  - `StarSelector` / `StarsDisplay` — seletor de nota (interativo) e exibição (estática),
    usados em Restaurantes e nos itens de Viagens.
- **Navegação entre "telas internas"** (detalhe de receita, detalhe de viagem) continua usando
  `hooks/navstack.js`, que integra com o botão voltar do Android via `history.pushState`/
  `popstate` — isso é estado do navegador, não do React, então foi mantido como módulo simples
  em vez de virar um hook com estado.
- **Sem mudança de lógica de negócio.** Regras de dados (paths do Realtime Database, validações,
  compressão de imagem, etc.) foram portadas como estavam — só a camada de renderização mudou.

## Estrutura de arquivos

```
index.html                 shell do Vite (não tem mais conteúdo estático das seções)
vite.config.js              config do Vite (plugin React)
package.json                 dependências e scripts (dev/build/preview/lint)
.env.example                  template das variáveis de ambiente do Firebase
vercel.json                    rewrite de /__/auth/* para o authDomain do Firebase (inalterado)
public/
  manifest.json               metadata do PWA
  sw.js                        Service Worker (reescrito: cache dinâmico, não lista fixa de
                                 arquivos — o build do Vite gera nomes com hash, então uma lista
                                 hardcoded de assets quebraria a cada build)
  (favicon*.ico/svg/png, apple-touch-icon.png, web-app-manifest-*.png — precisam ser copiados
   para cá; não estavam no material original enviado para a migração)
src/
  main.jsx                    entry point, monta <App /> e registra o Service Worker
  App.jsx                      shell da aplicação: tela de login, header, status bar, nav entre
                                 as 4 seções — substitui a lógica de setSection()/initNavigation()
                                 de app.js
  base.css, gifts.css, restaurants.css, travels.css, recipes.css
                                mesmos arquivos CSS do projeto original, sem alterações de conteúdo
  context/
    AppContext.jsx              estado global: auth (login/logout Google, e-mails permitidos),
                                  dados em tempo real das 4 seções, navegação entre seções e o
                                  estado compartilhado entre Restaurantes↔Viagens (vínculo de
                                  restaurante a uma viagem)
    ToastContext.jsx             toasts (substitui showToast/setStatus de utils.js)
  components/
    ImageDropzone.jsx            upload de imagem por clique/drag/paste, com compressão
    StarSelector.jsx              StarSelector (interativo) + StarsDisplay (estático)
  firebase/firebase.js            init do Firebase, export de db/auth/provider/ALLOWED
  hooks/navstack.js                pilha de views internas p/ botão voltar do Android
  utils/
    utils.js                      domain(), compressImage(), helpers de clipboard, formatStars()
    escapeHtml.js                  usado só onde ainda montamos HTML fora do React (popups do
                                     Leaflet, que não é uma lib React)
  sections/
    gifts/
      GiftSection.jsx              lista, abas (Caio/Clarice), formulário de adicionar, paste
                                     global de imagem
      GiftCard.jsx                  card individual: edição inline, exclusão
      fetchOG.js                    busca de título/imagem OpenGraph de uma URL (proxy allorigins)
    restaurants/
      RestaurantSection.jsx         lista, busca, filtros de tag
      AddRestaurantForm.jsx         formulário de adicionar (inclui vínculo com viagem pendente)
      RestaurantCard.jsx            card: nota, tags, notas, edição inline, exclusão
      RestaurantMap.jsx             mapa Leaflet com geocoding
      TagFilters.jsx                filtros de tag + criação de novas tags
    recipes/
      RecipeSection.jsx             lista/busca + alterna entre lista e detalhe
      RecipeForm.jsx                 formulário de adicionar/editar (chips de ingrediente)
      RecipeDetail.jsx               tela de detalhe (imagem, ingredientes, modo de preparo,
                                       editar/excluir) — substitui openRecipeDetail() de recipes.js
    travels/
      TravelSection.jsx              lista de destinos ⇄ detalhe, com navstack e a lógica de
                                       reabrir automaticamente uma viagem após vincular um
                                       restaurante a ela (reopenTravelKey)
      DestinationsList.jsx           lista de destinos + adicionar novo
      DestEditor.jsx                  edição inline de capa/nome do destino
      TravelDetail.jsx                 hero, abas de categoria, painel de adicionar, lista de itens
      TravelItemCard.jsx               card de um item (comida/atração/hospedagem/passeio/
                                         restaurante vinculado)
      TravelItemEditor.jsx             edição inline de um item de viagem
      TravelActions.jsx                 ação compartilhada: vincular um restaurante recém-criado
                                          a uma viagem pendente
      catHelpers.js                     resolução de caminho de categoria no DB (lida com o fato
                                          de que a chave de categoria no Realtime DB pode não bater
                                          com a chave "canônica" em TRAVEL_CATS)
      panels/
        CulinariaPanel.jsx, PasseiosPanel.jsx, AtracoesPanel.jsx, HospedagemPanel.jsx
                                         um painel de "adicionar item" por categoria de viagem
```

## Convenções de import

- Dentro de `src/sections/<secao>/`, imports para o "núcleo" do app (context, firebase, utils,
  hooks) sobem dois níveis: `../../firebase/firebase`, `../../context/AppContext`.
- Dentro de `src/sections/travels/panels/`, sobem três níveis: `../../../firebase/firebase`.
- `context/` e `components/` ficam direto em `src/` (um nível), não dentro de `sections/`.