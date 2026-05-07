import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import LandingApp from './App';
import { SimulatorApp } from './apps/SimulatorApp';

const App = import.meta.env.VITE_APP_TARGET === 'simulator' ? SimulatorApp : LandingApp;

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
