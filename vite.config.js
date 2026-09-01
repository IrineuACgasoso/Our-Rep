import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // O signInWithPopup do Firebase Auth precisa checar window.closed no popup pra saber quando
  // o login terminou. Com a política padrão do navegador (Cross-Origin-Opener-Policy: same-origin),
  // essa checagem é bloqueada, o que causa falhas intermitentes no login (às vezes funciona, às
  // vezes volta pra tela de login sem erro nenhum). 'same-origin-allow-popups' resolve isso sem
  // abrir mão do isolamento entre a página e outras abas não relacionadas.
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Separa o Firebase (SDK grande, muda pouco) do código do app num chunk próprio,
        // então o navegador consegue cachear esse chunk entre deploys que só mexem no app,
        // em vez de invalidar tudo de uma vez. Leaflet já sai em chunk separado sozinho
        // porque é importado com lazy() em RestaurantSection.
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/database'],
        },
      },
    },
  },
});