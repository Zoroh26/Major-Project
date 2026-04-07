import React from 'react';
import { Users, AlertTriangle, TrendingUp, Activity } from 'lucide-react';
import type { MlMetricsPayload } from '../services/api';

interface DataMetric {
  label: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
}

interface DataPanelProps {
  metrics?: MlMetricsPayload | null;
  sourceMode?: string | null;
}

const DataPanel = ({ metrics, sourceMode }: DataPanelProps) => {
  const metricsList: DataMetric[] = [
    {
      label: 'Detected People',
      value: metrics?.person_count ?? '--',
      icon: <Users className="w-6 h-6" />,
    },
    {
      label: 'Avg Confidence',
      value: metrics ? `${(metrics.average_confidence * 100).toFixed(1)}%` : '--',
      icon: <TrendingUp className="w-6 h-6" />,
    },
    {
      label: 'Max Confidence',
      value: metrics ? `${(metrics.max_confidence * 100).toFixed(1)}%` : '--',
      icon: <AlertTriangle className="w-6 h-6" />,
    },
    {
      label: 'Inference Runtime',
      value: metrics
        ? `${metrics.processing_time_ms.toFixed(0)}ms | ${metrics.inference_fps.toFixed(1)} FPS`
        : (sourceMode ?? '--'),
      icon: <Activity className="w-6 h-6" />,
    },
  ];


  return (
    <div className="w-full flex flex-col">
      <h3 className="text-primary font-semibold text-base mb-2">Real-time Metrics</h3>
      <div className="flex gap-2">
        {metricsList.map((metric, index) => (
          <div
            key={index}
            className="bg-card rounded-lg p-3 border-2 border-primary flex-1"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-1.5 bg-card rounded-lg border-2 border-primary">
                {metric.icon}
              </div>
            </div>
            <div className="flex items-end justify-between">
              <p className="text-l text-primary/70 ">{metric.label}</p>
              <p className="text-3xl font-bold text-primary">{metric.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DataPanel;
