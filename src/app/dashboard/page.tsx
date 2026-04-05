import { Suspense } from 'react';
import AppLayout from '@/components/AppLayout';
import KPIBentoGrid from './components/KPIBentoGrid';
import SalesChart from './components/SalesChart';
import TopItemsChart from './components/TopItemsChart';
import TableMapGrid from './components/TableMapGrid';
import KitchenQueue from './components/KitchenQueue';
import RecentOrdersFeed from './components/RecentOrdersFeed';
import DashboardHeader from './components/DashboardHeader';
import DashboardSkeleton from './components/DashboardSkeleton';

export default function DashboardPage() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-6 px-4 md:px-6 xl:px-8 2xl:px-10 py-6 max-w-screen-2xl mx-auto w-full">
        <DashboardHeader />
        <Suspense fallback={<DashboardSkeleton />}>
          <KPIBentoGrid />
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 flex flex-col gap-6">
              <SalesChart />
              <TopItemsChart />
            </div>
            <div className="flex flex-col gap-6">
              <KitchenQueue />
              <RecentOrdersFeed />
            </div>
          </div>
          <TableMapGrid />
        </Suspense>
      </div>
    </AppLayout>
  );
}