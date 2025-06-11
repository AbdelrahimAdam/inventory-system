import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

import { registerSW } from 'virtual:pwa-register'; // ✅ PWA register

// ✅ Register Service Worker only in production
if (import.meta.env.PROD) {
  registerSW({
    onNeedRefresh() {
      // Optional: Show toast to reload
      console.log("New content available, refresh to update.");
    },
    onOfflineReady() {
      console.log("App is ready to work offline.");
    },
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);


