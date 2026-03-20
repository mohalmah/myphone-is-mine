import React, { Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppLayout } from './AppLayout';

// Pages — lazy loaded for better performance
const OverviewPage = React.lazy(() => import('@/pages/OverviewPage'));
const LiveActivityPage = React.lazy(() => import('@/pages/LiveActivityPage'));
const AppsPage = React.lazy(() => import('@/pages/AppsPage'));
const AppDetailPage = React.lazy(() => import('@/pages/AppDetailPage'));
const NetworkPage = React.lazy(() => import('@/pages/NetworkPage'));
const RequestsPage = React.lazy(() => import('@/pages/RequestsPage'));
const LogsPage = React.lazy(() => import('@/pages/LogsPage'));
const StoragePage = React.lazy(() => import('@/pages/StoragePage'));
const BatteryPage = React.lazy(() => import('@/pages/BatteryPage'));
const ProcessPage = React.lazy(() => import('@/pages/ProcessPage'));
const UsagePage = React.lazy(() => import('@/pages/UsagePage'));
const ControlsPage = React.lazy(() => import('@/pages/ControlsPage'));
const AdvancedPage = React.lazy(() => import('@/pages/AdvancedPage'));
const ReportsPage = React.lazy(() => import('@/pages/ReportsPage'));
const SettingsPage = React.lazy(() => import('@/pages/SettingsPage'));

const PageFallback = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>
  </div>
);

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<PageFallback />}>
            <OverviewPage />
          </Suspense>
        ),
      },
      {
        path: 'live',
        element: (
          <Suspense fallback={<PageFallback />}>
            <LiveActivityPage />
          </Suspense>
        ),
      },
      {
        path: 'apps',
        element: (
          <Suspense fallback={<PageFallback />}>
            <AppsPage />
          </Suspense>
        ),
      },
      {
        path: 'apps/:pkg',
        element: (
          <Suspense fallback={<PageFallback />}>
            <AppDetailPage />
          </Suspense>
        ),
      },
      {
        path: 'network',
        element: (
          <Suspense fallback={<PageFallback />}>
            <NetworkPage />
          </Suspense>
        ),
      },
      {
        path: 'requests',
        element: (
          <Suspense fallback={<PageFallback />}>
            <RequestsPage />
          </Suspense>
        ),
      },
      {
        path: 'logs',
        element: (
          <Suspense fallback={<PageFallback />}>
            <LogsPage />
          </Suspense>
        ),
      },
      {
        path: 'storage',
        element: (
          <Suspense fallback={<PageFallback />}>
            <StoragePage />
          </Suspense>
        ),
      },
      {
        path: 'battery',
        element: (
          <Suspense fallback={<PageFallback />}>
            <BatteryPage />
          </Suspense>
        ),
      },
      {
        path: 'process',
        element: (
          <Suspense fallback={<PageFallback />}>
            <ProcessPage />
          </Suspense>
        ),
      },
      {
        path: 'usage',
        element: (
          <Suspense fallback={<PageFallback />}>
            <UsagePage />
          </Suspense>
        ),
      },
      {
        path: 'controls',
        element: (
          <Suspense fallback={<PageFallback />}>
            <ControlsPage />
          </Suspense>
        ),
      },
      {
        path: 'advanced',
        element: (
          <Suspense fallback={<PageFallback />}>
            <AdvancedPage />
          </Suspense>
        ),
      },
      {
        path: 'reports',
        element: (
          <Suspense fallback={<PageFallback />}>
            <ReportsPage />
          </Suspense>
        ),
      },
      {
        path: 'settings',
        element: (
          <Suspense fallback={<PageFallback />}>
            <SettingsPage />
          </Suspense>
        ),
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
