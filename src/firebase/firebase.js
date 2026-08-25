import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// E-mails autorizados a usar o app (checagem client-side, apenas UX).
// A checagem "de verdade" tem que existir nas Realtime Database Rules do Firebase Console.
export const ALLOWED = [
  'caioac2006@gmail.com',
  'clarifloralmeida@gmail.com',
  'cac@cin.ufpe.br',
];

// As credenciais do Firebase agora vêm de variáveis de ambiente (.env), em vez de
// hardcoded no bundle. Isso não é "segredo" (a apiKey do Firebase é pública por natureza,
// a segurança real está nas Database Rules), mas evita versionar config específica de projeto
// e facilita trocar de ambiente (dev/staging/prod) sem editar código.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();