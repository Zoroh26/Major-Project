import { useEffect, useRef, useState } from 'react';
import HLS from 'hls.js';

interface CameraFeedProps {
  streamUrl?: string; // HLS url fallback
  webrtcUrl?: string; // Zero latency WebRTC url
  cameraName?: string;
  isLoading?: boolean;
}

const CameraFeed = ({ streamUrl, webrtcUrl, cameraName = 'Camera Feed', isLoading = false }: CameraFeedProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!streamUrl || !videoRef.current) return;

    const video = videoRef.current;
    setError(null);
    setIsPlaying(true);

    // Check if HLS is supported
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = streamUrl;
    } else if (HLS.isSupported()) {
      // Use hls.js for other browsers
      const hls = new HLS({
        debug: false,
        enableWorker: true,
        lowLatencyMode: true,
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(HLS.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {
          // Autoplay might be blocked
        });
      });

      hls.on(HLS.Events.ERROR, (event, data) => {
        if (data.fatal) {
          setIsPlaying(false);
          const errorMsg = data.details || data.type || 'Unknown error';
          setError(`Stream error: ${errorMsg}`);
        }
      });

      return () => {
        hls.destroy();
      };
    } else {
      setError('HLS streaming is not supported in your browser');
      setIsPlaying(false);
    }
  }, [streamUrl]);

  // Fallback content when no stream
  if (!streamUrl && !webrtcUrl) {
    return (
      <div className="h-full w-full relative bg-card rounded-lg overflow-hidden border-2 border-primary flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 mb-2">No stream available</div>
          <div className="text-xs text-gray-500">Add a camera to view live feed</div>
        </div>
      </div>
    );
  }

  // WebRTC Iframe implementation for sub-second latency
  if (webrtcUrl) {
    return (
      <div className="h-full w-full relative bg-black rounded-lg overflow-hidden border-2 border-primary group">
        <iframe 
          src={webrtcUrl.replace('ws://', 'http://')}
          className="w-full h-full border-none"
          allow="autoplay; fullscreen"
          sandbox="allow-scripts allow-same-origin"
          scrolling="no"
          onLoad={() => setIsPlaying(true)}
        />
        
        {/* Recording indicator */}
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-500/80 px-3 py-2 rounded-full backdrop-blur-sm opacity-90 transition-opacity">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-white text-xs font-semibold">LIVE</span>
        </div>

        {/* Camera name overlay */}
        {cameraName && (
          <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-2 rounded backdrop-blur-sm opacity-90 transition-opacity">
            <span className="text-white text-sm font-medium">{cameraName}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full w-full relative bg-black rounded-lg overflow-hidden border-2 border-primary">
      {error ? (
        <div className="h-full w-full flex items-center justify-center bg-black">
          <div className="text-center text-red-400">
            <div className="mb-2">⚠️ Stream Error</div>
            <div className="text-xs">{error}</div>
          </div>
        </div>
      ) : isLoading ? (
        <div className="h-full w-full flex items-center justify-center bg-black">
          <div className="text-center text-gray-400">
            <div className="animate-spin mb-2">⏳</div>
            <div className="text-xs">Loading stream...</div>
          </div>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            autoPlay
            muted
            playsInline
          />

          {/* Recording indicator */}
          {isPlaying && (
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-500/80 px-3 py-2 rounded-full backdrop-blur-sm">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-white text-xs font-semibold">LIVE</span>
            </div>
          )}

          {/* Camera name overlay */}
          {cameraName && (
            <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-2 rounded backdrop-blur-sm">
              <span className="text-white text-sm font-medium">{cameraName}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CameraFeed;
