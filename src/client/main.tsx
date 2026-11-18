import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { flushOnExit, loadState } from './store.ts';
import './styles.css';

void loadState();
window.addEventListener('pagehide', flushOnExit);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
