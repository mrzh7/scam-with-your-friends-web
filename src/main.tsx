import { createRoot } from 'react-dom/client';
import App from './App';
import AdminPage from './components/AdminPage';
import './styles.css';
createRoot(document.getElementById('root')!).render(location.pathname === '/admin' || location.pathname.startsWith('/admin/') ? <AdminPage/> : <App/>);
