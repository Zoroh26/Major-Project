import React from 'react';
import { Heatmap } from '../components/Heatmap';
import { CameraFeed } from '../components/CameraFeed';
import { DataPanel } from '../components/DataPanel';

export default function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      {/* Header */}
      <div className="border-b border-slate-700 bg-gradient-to-r from-slate-900 to-slate-800 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Crowd Management
              </h1>
              <p className="text-slate-400 text-sm mt-1">Real-time monitoring and analytics</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Top Section: Heatmap and Camera Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 h-[500px]">
          {/* Heatmap Section */}
          <div className="flex flex-col">
            <div className="mb-3">
              <h2 className="text-xl font-semibold text-white">Crowd Density Heatmap</h2>
              <p className="text-slate-400 text-sm">Real-time spatial distribution analysis</p>
            </div>
            <div className="flex-1 bg-gradient-to-br from-blue-950 to-blue-900 rounded-lg shadow-lg border border-blue-800 overflow-hidden">
              <Heatmap />
            </div>
          </div>

          {/* Camera Feed Section */}
          <div className="flex flex-col">
            <div className="mb-3">
              <h2 className="text-xl font-semibold text-white">Camera Feed</h2>
              <p className="text-slate-400 text-sm">Live video stream monitoring</p>
            </div>
            <div className="flex-1 bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden">
              <CameraFeed />
            </div>
          </div>
        </div>

        {/* Bottom Section: Data Panel */}
        <div>
          <DataPanel />
        </div>
      </div>

      {/* Footer accent */}
      <div className="mt-12 border-t border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <p className="text-slate-500 text-xs text-center">
            © 2024 Crowd Management System. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
