import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const AppLayout = () => (
  <div className="flex h-screen w-screen overflow-hidden bg-background">
    <Sidebar />
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <Topbar />
      <main className="flex-1 overflow-hidden p-4">
        <Outlet />
      </main>
    </div>
  </div>
);

export default AppLayout;
