import { createContext, useContext, useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
  onAuthStateChanged,
  sendEmailVerification,
} from 'firebase/auth';
import { db, auth, provider, ALLOWED } from '../firebase/firebase';
import { useToast } from './ToastContext';

const AppContext = createContext(null);

const TRAVEL_CATS = [
  { key: 'culinaria', label: '🍜 Culinária' },
  { key: 'passeios', label: '🏛️ Passeios' },
  { key: 'atracoes', label: '🎡 Atrações' },
  { key: 'hospedagem', label: '🏨 Hospedagem' },
];
export { TRAVEL_CATS };

// Detecta ambientes onde o popup tende a falhar (iOS Safari / PWA standalone / in-app browsers)
function shouldPreferRedirect() {
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone === true;
  const isInApp = /FBAN|FBAV|Instagram|WhatsApp|Line\//i.test(ua);
  return isIOS || isStandalone || isInApp;
}

function isEmbeddedBrowser() {
  const ua = navigator.userAgent || '';
  return /FBAN|FBAV|Instagram|WhatsApp|Line\/|Twitter|GSA\//i.test(ua);
}

export function AppProvider({ children }) {
  const showToast = useToast();

  // ── Auth ──
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [embeddedBrowser] = useState(() => isEmbeddedBrowser());
  const [verificationSent, setVerificationSent] = useState(false);

  useEffect(() => {
    getRedirectResult(auth).catch(() => setLoginError('Erro ao entrar. Tente novamente.'));

    const unsub = onAuthStateChanged(auth, (u) => {
      setAuthLoading(false);
      if (u && ALLOWED.includes(u.email)) {
        setUser(u);
        setEmailVerified(u.emailVerified);
        setAccessDenied(false);
      } else {
        if (u) {
          fbSignOut(auth);
          setAccessDenied(true);
        }
        setUser(null);
        setEmailVerified(false);
        setVerificationSent(false);
        setSigningIn(false);
      }
    });
    return unsub;
  }, []);

  // As Database Rules do Firebase exigem auth.token.email_verified === true. Assim que
  // detectamos um usuário autorizado mas ainda não verificado, disparamos o e-mail de
  // confirmação automaticamente (uma vez por sessão) para o usuário poder validar a conta.
  useEffect(() => {
    if (user && !emailVerified && !verificationSent) {
      sendEmailVerification(user)
        .then(() => setVerificationSent(true))
        .catch(() => {});
    }
  }, [user, emailVerified, verificationSent]);

  async function resendVerification() {
    if (!auth.currentUser) return;
    try {
      await sendEmailVerification(auth.currentUser);
      setVerificationSent(true);
      showToast('E-mail de verificação reenviado! Confira sua caixa de entrada.');
    } catch {
      showToast('Erro ao enviar o e-mail de verificação. Tente novamente em instantes.');
    }
  }

  // Recarrega o usuário atual (após ele clicar no link de confirmação) para reavaliar
  // emailVerified sem precisar deslogar/logar de novo.
  async function refreshVerification() {
    if (!auth.currentUser) return;
    try {
      await auth.currentUser.reload();
      const verified = auth.currentUser.emailVerified;
      setEmailVerified(verified);
      if (!verified) showToast('Ainda não encontramos a confirmação. Verifique seu e-mail e tente de novo.');
    } catch {
      showToast('Erro ao verificar. Tente novamente.');
    }
  }

  async function signIn() {
    setSigningIn(true);
    setLoginError('');

    // Popup é mais confiável que redirect em localhost/dev (o redirect depende de storage
    // entre domínios que o navegador às vezes particiona/bloqueia em ambiente local, causando
    // uma volta "silenciosa" pra tela de login sem erro nenhum). Em iOS Safari, PWA instalado
    // ou navegadores embutidos (Instagram/WhatsApp/etc.) o popup costuma ser bloqueado ou nem
    // abrir, então nesses casos usamos redirect direto.
    if (shouldPreferRedirect()) {
      try {
        await signInWithRedirect(auth, provider);
      } catch {
        setLoginError('Erro ao entrar. Tente novamente.');
        setSigningIn(false);
      }
      return;
    }

    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged cuida do resto (setUser/setAccessDenied); só limpamos o spinner aqui.
      setSigningIn(false);
    } catch (err) {
      // Se o popup foi bloqueado pelo navegador, caímos pra redirect como último recurso.
      if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/cancelled-popup-request') {
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch {
          // segue para o setLoginError abaixo
        }
      }
      if (err?.code !== 'auth/popup-closed-by-user') {
        setLoginError('Erro ao entrar. Tente novamente.');
      }
      setSigningIn(false);
    }
  }

  async function signOut() {
    await fbSignOut(auth);
    showToast('Até logo! 👋');
  }

  // ── Dados em tempo real (Realtime Database) ──
  const [status, setStatus] = useState('connecting'); // connecting | connected | error | permission-denied
  const [giftsData, setGiftsData] = useState({ mine: {}, hers: {} });
  const [restaurantsData, setRestaurantsData] = useState({});
  const [tagsData, setTagsData] = useState({});
  const [travelsData, setTravelsData] = useState({});
  const [recipesData, setRecipesData] = useState({});

  // As Database Rules exigem e-mail verificado; se o Firebase recusar por PERMISSION_DENIED,
  // mostramos um status amigável em vez de deixar o app travado num "Erro de conexão" genérico.
  function handleDbError(err) {
    if (err?.code === 'PERMISSION_DENIED') {
      setStatus('permission-denied');
    } else {
      setStatus('error');
    }
  }

  useEffect(() => {
    // As regras do Firebase exigem e-mail verificado para ler/escrever, então só assinamos
    // os listeners depois que o e-mail estiver confirmado — evita chamadas que já sabemos
    // que vão falhar com PERMISSION_DENIED.
    if (!user || !emailVerified) return;

    const unsubs = [];
    ['mine', 'hers'].forEach((tab) => {
      unsubs.push(
        onValue(
          ref(db, `gifts/${tab}`),
          (snap) => {
            setGiftsData((prev) => ({ ...prev, [tab]: snap.val() || {} }));
            setStatus('connected');
          },
          handleDbError
        )
      );
    });
    unsubs.push(
      onValue(ref(db, 'restaurants'), (snap) => setRestaurantsData(snap.val() || {}), handleDbError)
    );
    unsubs.push(
      onValue(ref(db, 'restTags'), (snap) => setTagsData(snap.val() || {}), handleDbError)
    );
    unsubs.push(
      onValue(ref(db, 'travels'), (snap) => setTravelsData(snap.val() || {}), handleDbError)
    );
    unsubs.push(
      onValue(ref(db, 'recipes'), (snap) => setRecipesData(snap.val() || {}), handleDbError)
    );

    return () => unsubs.forEach((unsub) => unsub());
  }, [user, emailVerified]);

  // ── Navegação entre seções + estado compartilhado entre Restaurantes/Viagens ──
  const [activeSection, setActiveSection] = useState('gifts');
  // Quando o usuário clica "cadastrar restaurante" a partir de uma viagem, guardamos
  // qual viagem está pendente de vínculo, para a aba Restaurantes saber disso.
  const [pendingTravelRestaurant, setPendingTravelRestaurant] = useState(null);
  // Quando um restaurante vinculado a uma viagem é salvo, guardamos a chave da viagem aqui
  // para a seção Viagens reabrir automaticamente o detalhe dela.
  const [reopenTravelKey, setReopenTravelKey] = useState(null);

  const value = {
    // auth
    authLoading,
    user,
    emailVerified,
    verificationSent,
    accessDenied,
    loginError,
    signingIn,
    embeddedBrowser,
    signIn,
    signOut,
    resendVerification,
    refreshVerification,
    // dados
    status,
    giftsData,
    restaurantsData,
    tagsData,
    travelsData,
    recipesData,
    // navegação
    activeSection,
    setActiveSection,
    pendingTravelRestaurant,
    setPendingTravelRestaurant,
    reopenTravelKey,
    setReopenTravelKey,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp precisa estar dentro de <AppProvider>');
  return ctx;
}