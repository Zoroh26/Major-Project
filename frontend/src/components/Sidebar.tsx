import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, LogOut, Map, Users, ChevronLeft, Menu } from 'lucide-react';
import { useAuthStore } from '../store/auth';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/zones', label: 'Zone Mapping', icon: Map },
  { to: '/personnel', label: 'Personnel', icon: Users },
];

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const logout = useAuthStore((s) => s.logout);

  return (
    <aside
      className={`${isCollapsed ? 'w-20' : 'w-64'
        } transition-all duration-300 ease-in-out overflow-hidden shrink-0 h-full bg-primary-container flex flex-col`}
    >
      {/* Header / Toggle */}
      <div className={`h-16 flex items-center shrink-0 border-b border-outline-variant/15 ${isCollapsed ? 'justify-center' : 'justify-between px-4'}`}>
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-tight">CROWDVISION</span>
          </div>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
        >
          {isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 flex flex-col gap-1 p-2 pt-4 min-h-0 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center rounded-lg transition-all duration-200 whitespace-nowrap
              ${isCollapsed ? 'justify-center px-0 h-10' : 'gap-3 px-3 py-2.5'}
              ${isActive
                ? 'bg-white/20 text-white font-semibold'
                : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Icon size={20} className="shrink-0" />
            {!isCollapsed && (
              <span className="text-sm transition-opacity duration-200">
                {label}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout - Always visible at bottom */}
      <div className="shrink-0 p-2 pb-4 border-t border-outline-variant/15">
        <button
          onClick={logout}
          className={`w-full flex items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-all duration-200 whitespace-nowrap
            ${isCollapsed ? 'justify-center px-0 h-10' : 'gap-3 px-3 py-2.5'}`}
        >
          <LogOut size={20} className="shrink-0" />
          {!isCollapsed && (
            <span className="text-sm transition-opacity duration-200">
              Logout
            </span>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
