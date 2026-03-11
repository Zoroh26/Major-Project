import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Camera, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/auth';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/cameras', label: 'Cameras', icon: Camera },
  { to: '/security', label: 'Security', icon: LayoutDashboard },
];

const Sidebar = () => {
  const logout = useAuthStore((s) => s.logout);

  return (
    <aside className="w-16 hover:w-52 transition-all duration-300 ease-in-out overflow-hidden shrink-0 h-full bg-primary flex flex-col group">
      {/* Logo */}
      <div className="h-16 flex items-center justify-center shrink-0 border-b border-white/10">
        <span className="text-2xl">📹</span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 flex flex-col gap-1 p-2 pt-4">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors whitespace-nowrap
              ${isActive
                ? 'bg-white/20 text-white font-semibold'
                : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Icon size={20} className="shrink-0" />
            <span className="text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {label}
            </span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-2 pb-4 border-t border-white/10">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap"
        >
          <LogOut size={20} className="shrink-0" />
          <span className="text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
