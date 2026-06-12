import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@shopify/polaris/build/esm/styles.css';
import './overrides.css';
import enTranslations from '@shopify/polaris/locales/en.json';
import { AppProvider } from '@shopify/polaris';
import App from './App';
import './locales/i18n';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppProvider i18n={enTranslations}>
        <Suspense fallback={null}>
          <App />
        </Suspense>
      </AppProvider>
    </BrowserRouter>
  </StrictMode>
);
