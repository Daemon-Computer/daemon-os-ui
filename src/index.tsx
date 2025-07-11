/* @refresh reload */
import { render } from 'solid-js/web';
import 'solid-devtools';

import './api/game/gameBridge';

import './index.css';
import './components/Theme/theme.css';
import App from './App';
import { ProgramProvider } from './components/ProgramWindow/programContext';

const root = document.getElementById('root');

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?',
  );
}

render(
  () => (
    <ProgramProvider>
      <App />
    </ProgramProvider>
  ),
  root!,
);
