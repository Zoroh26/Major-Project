import React, { useState, useEffect } from 'react';
import { Users, AlertTriangle, TrendingUp, Activity } from 'lucide-react';

interface DataMetric {
  label: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
  color: string;
}



const DataPanel = () => {

const [metrics, setMetrics] = useState<DataMetric[]>([
    {
      label: 'Current Crowd Density',
      value: '742',
      change: '+8.2%',
      icon: <Users className="w-6 h-6" />,
      color: 'from-blue-600 to-blue-700',
    },
    {
      label: 'Average Flow Rate',
      value: '45',
      change: '+3.5%',
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'from-green-600 to-green-700',
    },
    {
      label: 'Critical Zones',
      value: '3',
      change: '-1',
      icon: <AlertTriangle className="w-6 h-6" />,
      color: 'from-amber-600 to-amber-700',
    },
    {
      label: 'System Status',
      value: 'Active',
      icon: <Activity className="w-6 h-6" />,
      color: 'from-emerald-600 to-emerald-700',
    },
  ]);



useEffect(() => {
    // Simulate live updates
    const interval = setInterval(() => {
      setMetrics((prev) =>
        prev.map((metric) => {
          if (metric.label === 'Current Crowd Density') {
            const newValue = parseInt(metric.value.toString()) + Math.floor(Math.random() * 20 - 10);
            return {
              ...metric,
              value: Math.max(0, newValue),
              change: `+${(Math.random() * 15).toFixed(1)}%`,
            };
          }
          return metric;
        })
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);



  return (
    <div className="w-full bg-gradient-to-r from-slate-800 via-slate-800 to-slate-900 rounded-lg shadow-lg p-6">
      <h3 className="text-white font-semibold text-lg mb-6">Real-time Metrics</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className={`bg-gradient-to-br ${metric.color} rounded-lg p-4 text-white shadow-lg hover:shadow-xl transition-shadow duration-300`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-white bg-opacity-20 rounded-lg backdrop-blur-sm">
                {metric.icon}
              </div>
              {metric.change && (
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    metric.change.startsWith('-')
                      ? 'bg-red-500 bg-opacity-30'
                      : 'bg-green-500 bg-opacity-30'
                  }`}
                >
                  {metric.change}
                </span>
              )}
            </div>
            <p className="text-sm text-white text-opacity-80 mb-1">{metric.label}</p>
            <p className="text-3xl font-bold">{metric.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default DataPanel
