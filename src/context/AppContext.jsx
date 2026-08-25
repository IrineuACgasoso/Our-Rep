import { createContext, useContext, useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
  onAuthStateChanged,
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
  const [accessDenied, setAccessDenied] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [embeddedBrowser] = useState(() => isEmbeddedBrowser());

  useEffect(() => {
    getRedirectResult(auth).catch(() => setLoginError('Erro ao entrar. Tente novamente.'));

    const unsub = onAuthStateChanged(auth, (u) => {
      setAuthLoading(false);
      if (u && ALLOWED.includes(u.email)) {
        setUser(u);
        setAccessDenied(false);
      } else {
        if (u) {
          fbSignOut(auth);
          setAccessDenied(true);
        }
        setUser(null);
        setSigningIn(false);
      }
    });
    return unsub;
  }, []);

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
  const [status, setStatus] = useState('connecting'); // connecting | connected | error
  const [giftsData, setGiftsData] = useState({ mine: {}, hers: {} });
  const [restaurantsData, setRestaurantsData] = useState({});
  const [tagsData, setTagsData] = useState({});
  const [travelsData, setTravelsData] = useState({});
  const [recipesData, setRecipesData] = useState({});

  useEffect(() => {
    if (!user) return;

    const unsubs = [];
    ['mine', 'hers'].forEach((tab) => {
      unsubs.push(
        onValue(
          ref(db, `gifts/${tab}`),
          (snap) => {
            setGiftsData((prev) => ({ ...prev, [tab]: snap.val() || {} }));
            setStatus('connected');
          },
          () => setStatus('error')
        )
      );
    });
    unsubs.push(
      onValue(ref(db, 'restaurants'), (snap) => setRestaurantsData(snap.val() || {}), () => setStatus('error'))
    );
    unsubs.push(
      onValue(ref(db, 'restTags'), (snap) => setTagsData(snap.val() || {}), () => setStatus('error'))
    );
    unsubs.push(
      onValue(ref(db, 'travels'), (snap) => setTravelsData(snap.val() || {}), () => setStatus('error'))
    );
    unsubs.push(
      onValue(ref(db, 'recipes'), (snap) => setRecipesData(snap.val() || {}), () => setStatus('error'))
    );

    return () => unsubs.forEach((unsub) => unsub());
  }, [user]);

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
    accessDenied,
    loginError,
    signingIn,
    embeddedBrowser,
    signIn,
    signOut,
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