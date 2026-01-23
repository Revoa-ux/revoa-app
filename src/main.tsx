import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { toast } from 'sonner';

// Debug flag
const DEBUG = import.meta.env.DEV;

// Debug logging helper
const log = (message: string, data?: any) => {
  if (DEBUG) {
    console.log(`[App] ${message}`, data || '');
  }
};

// Global error handler
window.addEventListener('error', (event) => {
  console.error('[Global Error]', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Promise Rejection]', event.reason);
});

// Initialize app
const initializeApp = () => {
  try {
    log('Initializing application...');

    // Unregister any existing service workers to prevent caching issues
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => registration.unregister());
        log('Unregistered service workers', { count: registrations.length });
      }).catch(err => {
        log('Failed to unregister service workers', err);
      });
    }

    // Initialize app
    const root = document.getElementById('root');
    if (!root) {
      throw new Error('Root element not found');
    }

    log('Rendering application...');

    // Hide initial loader before React renders
    const initialLoader = document.getElementById('initial-loader');
    if (initialLoader) {
      initialLoader.style.display = 'none';
    }

    createRoot(root).render(
      <StrictMode>
        <ErrorBoundary>
          <HelmetProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </HelmetProvider>
        </ErrorBoundary>
      </StrictMode>
    );

    log('Application rendered successfully');
  } catch (error) {
    console.error('[Init Error]', error);
    log('Failed to initialize app:', error);

    // Show error UI
    const root = document.getElementById('root');
    if (root) {
      root.innerHTML = `
        <div style="
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          text-align: center;
          font-family: system-ui, -apple-system, sans-serif;
          background-color: #f9fafb;
        ">
          <div>
            <h1 style="
              font-size: 24px;
              font-weight: 500;
              color: #1f2937;
              margin-bottom: 8px;
            ">Unable to Initialize Application</h1>
            <p style="
              font-size: 16px;
              color: #6b7280;
              margin-bottom: 16px;
            ">${error instanceof Error ? error.message : 'An unexpected error occurred'}</p>
            <button
              onclick="window.location.reload()"
              style="
                background: #1f2937;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 8px;
                font-size: 14px;
                cursor: pointer;
                transition: background-color 0.2s;
              "
              onmouseover="this.style.backgroundColor='#374151'"
              onmouseout="this.style.backgroundColor='#1f2937'"
            >
              Retry
            </button>
          </div>
        </div>
      `;
    }

    toast.error('Failed to initialize application');
  }
};

// Start initialization
log('Starting application initialization...');
initializeApp();