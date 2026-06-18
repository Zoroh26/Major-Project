import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/auth';
import SecurityDashboard from './SecurityDashboard';
import CameraGridDashboard from './CameraGridDashboard';

const Dashboard = () => {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading time for role check
    const timer = setTimeout(() => setIsLoading(false), 100);
    return () => clearTimeout(timer);
  }, [user]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block animate-spin">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
          <p className="mt-4 text-primary">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  // Route to appropriate dashboard based on user role
  if (user?.role === 'security') {
    return <SecurityDashboard />;
  }

  if (user?.role === 'admin') {
    return <CameraGridDashboard />;
  }

  // Default to camera grid dashboard for employees or other roles
  return <CameraGridDashboard />;
};

export default Dashboard;
