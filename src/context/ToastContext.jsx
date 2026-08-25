import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [message, setMessage] = useState('');
  const [show, setShow] = useState(false);
  const timerRef = useRef(null);

  const showToast = useCallback((m) => {
    setMessage(m);
    setShow(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShow(false), 2500);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className={`toast${show ? ' show' : ''}`}>{message}</div>
    </ToastContext.Provider>
  );
}

/** Hook para disparar toasts de qualquer componente: const showToast = useToast(); */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast precisa estar dentro de <ToastProvider>');
  return ctx;
}