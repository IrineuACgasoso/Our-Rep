import { signInWithPopup, signOut as fbSignOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { auth, provider, ALLOWED } from './firebase.js';
import { showToast } from './utils.js';

const GOOGLE_BTN_HTML = `<svg class="google-icon" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.29-8.16 2.29-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg> Entrar com Google`;

function showLoginErr(m) {
  const e = document.getElementById('loginErr');
  e.textContent = m;
  e.style.display = m ? 'block' : 'none';
}

function resetLoginBtn() {
  const btn = document.getElementById('loginBtn');
  btn.disabled = false;
  btn.innerHTML = GOOGLE_BTN_HTML;
}

export async function signIn() {
  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.innerHTML = `<div class="spinner" style="border-top-color:var(--acc);border-color:var(--border2)"></div> Entrando...`;
  showLoginErr('');
  try {
    await signInWithPopup(auth, provider);
  } catch {
    showLoginErr('Erro ao entrar. Tente novamente.');
    resetLoginBtn();
  }
}

export async function signOut() {
  await fbSignOut(auth);
  showToast('Até logo! 👋');
}

export function initAuth(onAuthenticated) {
  document.getElementById('loginBtn').addEventListener('click', signIn);
  document.querySelector('.logout-btn').addEventListener('click', signOut);

  onAuthStateChanged(auth, user => {
    if (user && ALLOWED.includes(user.email)) {
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('appScreen').style.display = 'block';
      document.getElementById('userAvatar').src = user.photoURL || '';
      document.getElementById('userName').textContent = user.displayName || user.email;
      onAuthenticated();
    } else {
      if (user) { fbSignOut(auth); showLoginErr('Acesso negado.'); }
      document.getElementById('loginScreen').style.display = 'flex';
      document.getElementById('appScreen').style.display = 'none';
    }
  });
}
