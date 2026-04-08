import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { EscalationNotification } from './EscalationNotification';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/cameras': 'Cameras',
};

const Topbar = () => {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const title = pageTitles[location.pathname] ?? 'App';

  return (
    <header className="h-16 shrink-0 bg-surface-container-low border-b border-outline-variant/15 flex items-center justify-between px-6">
      <h1 className="text-xl font-bold text-primary">{title}</h1>
      <div className="flex items-center gap-4">
        <EscalationNotification />
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <span className="text-sm text-primary font-medium hidden sm:block">{user?.name ?? 'User'}</span>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
