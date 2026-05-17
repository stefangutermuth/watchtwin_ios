import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { ToastProvider } from './components/Toast.tsx'
import { ensureFreshAfterAppUpdate } from './services/versionCacheBust.ts'

// Bei App-Update WebView-Caches leeren, damit der neue JS-Bundle garantiert
// aktiv wird. Läuft async, blockiert das Mount nicht — bei Versionswechsel
// triggert es einen Reload nach dem Cache-Clear.
ensureFreshAfterAppUpdate();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
)
