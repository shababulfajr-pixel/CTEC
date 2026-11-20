import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Tier 1 Google Maps Platform Quota & Error Defense (Demo Key)
(window as unknown as { gm_authFailure?: () => void }).gm_authFailure = () => {
  window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  window.dispatchEvent(new CustomEvent('gmp-map-error', { detail: 'gm_authFailure' }));
};

const origConsoleError = console.error;
console.error = (...args: unknown[]) => {
  origConsoleError.apply(console, args);
  const msg = args.map((a) => String(a)).join(' ');
  if (msg.includes('OverQuotaMapError') || msg.includes('QuotaExceededError')) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    window.dispatchEvent(new CustomEvent('gmp-map-error', { detail: 'OverQuotaMapError' }));
  } else if (msg.includes('RefererNotAllowedMapError')) {
    window.dispatchEvent(new CustomEvent('gmp-map-error', { detail: 'RefererNotAllowedMapError' }));
  } else if (msg.includes('ApiNotActivatedMapError')) {
    window.dispatchEvent(new CustomEvent('gmp-map-error', { detail: 'ApiNotActivatedMapError' }));
  } else if (msg.includes('InvalidKeyMapError')) {
    window.dispatchEvent(new CustomEvent('gmp-map-error', { detail: 'InvalidKeyMapError' }));
  } else if (msg.includes('BillingNotEnabledMapError')) {
    window.dispatchEvent(new CustomEvent('gmp-map-error', { detail: 'BillingNotEnabledMapError' }));
  }
};

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
