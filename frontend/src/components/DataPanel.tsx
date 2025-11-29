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
    <div className="w-full flex flex-col">
      <h3 className="text-primary font-semibold text-base mb-2">Real-time Metrics</h3>
      <div className="flex gap-2">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className="bg-card rounded-lg p-3 border-2 border-primary flex-1"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-1.5 bg-card rounded-lg border-2 border-primary">
                {metric.icon}
              </div>
              {metric.change && (
                <span
                  className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                    metric.change.startsWith('-')
                      ? 'bg-red-500/20 text-red-700'
                      : 'bg-green-500/20 text-green-700'
                  }`}
                >
                  {metric.change}
                </span>
              )}
            </div>
            <div className="flex items-end justify-between">
              <p className="text-l text-primary/70 ">{metric.label}</p>
              <p className="text-3xl font-bold text-primary">{metric.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default DataPanel
