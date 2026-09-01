import { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import GiftsSection from './sections/gifts/GiftSection';
import RestaurantsSection from './sections/restaurants/RestaurantSection';
import TravelsSection from './sections/travels/TravelSection';
import RecipesSection from './sections/recipes/RecipeSection';

const SECTIONS = [
  { id: 'gifts', icon: '🎁', label: 'Presentes' },
  { id: 'restaurants', icon: '🍽️', label: 'Restaurantes' },
  { id: 'travels', icon: '✈️', label: 'Viagens' },
  { id: 'recipes', icon: '🍇', label: 'Receitas' },
];

function LoginScreen() {
  const { signIn, signingIn, loginError, accessDenied, embeddedBrowser } = useApp();
  return (
    <div id="loginScreen">
      <div className="login-card">
        <div className="login-emoji">🎁</div>
        <h1>Nossa Lista de Coisas</h1>
        <p>Entre com sua conta Google para continuar.</p>
        {embeddedBrowser && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Dica: se o login falhar, abra este link no navegador (Chrome/Safari) em vez do app de mensagens.
          </p>
        )}
        <button type="button" className="rest-action-btn" onClick={signIn} disabled={signingIn}>
          {signingIn ? 'Entrando...' : 'Entrar com Google'}
        </button>
        {accessDenied && (
          <div className="login-err" style={{ display: 'block' }}>
            Este e-mail não tem acesso a este app.
          </div>
        )}
        {loginError && (
          <div className="login-err" style={{ display: 'block' }}>
            {loginError}
          </div>
        )}
      </div>
    </div>
  );
}

function VerifyEmailScreen() {
  const { user, verificationSent, resendVerification, refreshVerification, signOut } = useApp();
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleCheck() {
    setChecking(true);
    await refreshVerification();
    setChecking(false);
  }

  async function handleResend() {
    setResending(true);
    await resendVerification();
    setResending(false);
  }

  return (
    <div id="loginScreen">
      <div className="login-card">
        <div className="login-emoji">📧</div>
        <h1>Confirme seu e-mail</h1>
        <p>
          Enviamos um link de confirmação para <strong>{user?.email}</strong>. Abra o e-mail e clique no
          link para liberar o acesso — as regras do banco exigem e-mail verificado.
        </p>
        <button type="button" className="rest-action-btn" onClick={handleCheck} disabled={checking} style={{ marginTop: 10 }}>
          {checking ? 'Verificando...' : 'Já confirmei, continuar'}
        </button>
        <button type="button" className="rest-action-btn" onClick={handleResend} disabled={resending} style={{ marginTop: 8 }}>
          {resending ? 'Enviando...' : verificationSent ? 'Reenviar e-mail' : 'Enviar e-mail de confirmação'}
        </button>
        <button type="button" className="rest-action-btn" onClick={signOut} style={{ marginTop: 8 }}>
          Sair
        </button>
      </div>
    </div>
  );
}

function AppShell() {
  const { authLoading, user, emailVerified, status, activeSection, setActiveSection } = useApp();

  if (authLoading) return null;
  if (!user) return <LoginScreen />;
  if (!emailVerified) return <VerifyEmailScreen />;

  return (
    <div data-section={activeSection}>
      <header>
        <h1>Nossa Lista de Coisas 🎁</h1>
        <p>Presentes, restaurantes, viagens e receitas — tudo num só lugar</p>
      </header>

      <div className={`status-bar ${status}`}>
        <span className="status-dot" />
        {status === 'connected'
          ? 'Conectado'
          : status === 'permission-denied'
          ? 'Confirme seu e-mail para ter acesso'
          : status === 'error'
          ? 'Erro de conexão'
          : 'Conectando...'}
      </div>

      <nav className="main-nav">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            id={`nav-${s.id}`}
            type="button"
            className={`main-nav-btn${activeSection === s.id ? ' active' : ''}`}
            onClick={() => setActiveSection(s.id)}
          >
            <span className="nav-icon">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </nav>

      <main>
        {/* Todas as seções ficam montadas (igual ao original, que usava display:none via CSS) para
            não perder rascunhos de formulário/estado local ao trocar de aba. Só a visível recebe .active. */}
        <div id="panel-gifts" className={`section-panel${activeSection === 'gifts' ? ' active' : ''}`}>
          <GiftsSection />
        </div>
        <div id="panel-restaurants" className={`section-panel${activeSection === 'restaurants' ? ' active' : ''}`}>
          <RestaurantsSection />
        </div>
        <div id="panel-travels" className={`section-panel${activeSection === 'travels' ? ' active' : ''}`}>
          <TravelsSection />
        </div>
        <div id="panel-recipes" className={`section-panel${activeSection === 'recipes' ? ' active' : ''}`}>
          <RecipesSection />
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </ToastProvider>
  );
}
