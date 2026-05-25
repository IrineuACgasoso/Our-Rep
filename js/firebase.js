import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

export const ALLOWED = [
  'caioac2006@gmail.com',
  'clarifloralmeida@gmail.com',
  'cac@cin.ufpe.br'
];

const firebaseConfig = {
  apiKey: "AIzaSyBduG0oZnA__HxcvQ16f7wC2TlcSgGEuBQ",
  authDomain: "present-list-98062.firebaseapp.com",
  databaseURL: "https://present-list-98062-default-rtdb.firebaseio.com",
  projectId: "present-list-98062",
  storageBucket: "present-list-98062.firebasestorage.app",
  messagingSenderId: "315312791192",
  appId: "1:315312791192:web:a05e8eeed46fb867db7aed"
};

export const db = getDatabase(initializeApp(firebaseConfig));
export const auth = getAuth();
export const provider = new GoogleAuthProvider();
