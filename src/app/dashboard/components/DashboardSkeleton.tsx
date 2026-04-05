export default function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* KPI bento skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="sm:col-span-2 lg:col-span-2 h-36 rounded-2xl" style={{ backgroundColor: '#1a2535' }} />
        <div className="h-36 rounded-2xl" style={{ backgroundColor: '#1a2535' }} />
        <div className="h-36 rounded-2xl" style={{ backgroundColor: '#1a2535' }} />
        <div className="h-36 rounded-2xl" style={{ backgroundColor: '#1a2535' }} />
        <div className="h-36 rounded-2xl" style={{ backgroundColor: '#1a2535' }} />
        <div className="h-36 rounded-2xl" style={{ backgroundColor: '#1a2535' }} />
        <div className="h-36 rounded-2xl" style={{ backgroundColor: '#1a2535' }} />
      </div>
      {/* Charts + sidebar skeleton */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 flex flex-col gap-6">
          <div className="h-72 rounded-2xl" style={{ backgroundColor: '#1a2535' }} />
          <div className="h-64 rounded-2xl" style={{ backgroundColor: '#1a2535' }} />
        </div>
        <div className="flex flex-col gap-6">
          <div className="h-80 rounded-2xl" style={{ backgroundColor: '#1a2535' }} />
          <div className="h-72 rounded-2xl" style={{ backgroundColor: '#1a2535' }} />
        </div>
      </div>
      {/* Table map skeleton */}
      <div className="h-64 rounded-2xl" style={{ backgroundColor: '#1a2535' }} />
    </div>
  );
}