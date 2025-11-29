import HeatMap from '../components/HeatMap';
import CameraFeed from '../components/CameraFeed';
import DataPanel from '../components/DataPanel';



const Dashboard = () => {
  return (
    <div className="h-[98vh] bg-background p-6 overflow-hidden">
      <div className="grid grid-cols-4 gap-2 h-full" style={{ gridTemplateRows: '10% 31% 31% 28%' }}>
        {/* div1 - Welcome */}
        <div className="col-span-4 flex items-center">
          <h1 className="text-3xl font-bold text-primary">Welcome to Dashboard</h1>
        </div>

        {/* div4 - Camera Feed */}
        <div className="col-span-2 row-span-2 col-start-1 row-start-2 bg-card rounded-lg border-2 border-primary p-4 overflow-hidden">
          <h2 className="text-lg font-semibold text-primary mb-2">Camera Feed</h2>
          <div className="h-[calc(100%-2.5rem)]">
            <CameraFeed />
          </div>
        </div>

        {/* div5 - Heatmap */}
        <div className="col-span-2 row-span-2 col-start-3 row-start-2 bg-card rounded-lg border-2 border-primary p-4 overflow-hidden">
          <h2 className="text-lg font-semibold text-primary mb-2">Crowd Density Heatmap</h2>
          <div className="h-[calc(100%-2.5rem)]">
            <HeatMap />
          </div>
        </div>

        {/* div2 - Real-time Metrics */}
        <div className="col-span-4 col-start-1 row-start-4 bg-card rounded-lg border-2 border-primary p-3 overflow-hidden flex">
          <DataPanel />
        </div>
      </div>
    </div>
  )
}

export default Dashboard
