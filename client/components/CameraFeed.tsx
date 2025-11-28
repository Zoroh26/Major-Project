import React from 'react';

export const CameraFeed: React.FC = () => {
  return (
    <div className="h-full w-full relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg shadow-lg overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(68,68,68,.2)_25%,rgba(68,68,68,.2)_50%,transparent_50%,transparent_75%,rgba(68,68,68,.2)_75%,rgba(68,68,68,.2))] bg-[length:60px_60px] animate-pulse" />

      <video
        className="w-full h-full object-cover"
        autoPlay
        muted
        loop
        playsInline
      >
        <source src="data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc2MtbXA0MXZ0aHVtYm5haWwAAAxybWluZgAAAEBtb292AAAALG12aGQAAAAA4d87+OHfO/gAAA8YAAAfUAABAAwAAAMAAAAAAAAAEQAAAAAAAAAAAAAB" type="video/mp4" />
      </video>

      {/* Recording indicator */}
      <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-500 bg-opacity-80 px-3 py-2 rounded-full backdrop-blur-sm">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
        <span className="text-white text-xs font-semibold">LIVE</span>
      </div>
    </div>
  );
};
