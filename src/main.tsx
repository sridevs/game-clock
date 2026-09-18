import { createRoot } from 'react-dom/client';
import { TableApp } from './ui/TableApp';
import { TableRepository } from './storage/TableRepository';
import './styles.css';

createRoot(document.getElementById('root')!).render(<TableApp repository={new TableRepository(localStorage)} />);
