import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { LocalGameRepository } from './storage/GameRepository';
import './styles.css';

createRoot(document.getElementById('root')!).render(<App repository={new LocalGameRepository(localStorage)} />);
