import '@fontsource-variable/inter/wght.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import './styles/index.css';
import { StrictMode, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import { AppShell } from './app/AppShell';
import { ErrorBoundary } from './app/ErrorBoundary';
import { initTheme } from './app/theme';
import { CommandPalette } from './ui/CommandPalette';
import { Toaster } from './ui/Toast';
import { TooltipProvider } from './ui/Tooltip';

initTheme();

const Gallery = lazy(() => import('./routes/Gallery'));
const Lab = lazy(() => import('./routes/lab/Lab'));

const router = createBrowserRouter(
  [
    {
      element: <AppShell />,
      children: [
        { index: true, element: <Navigate to="/lab" replace /> },
        {
          path: 'lab',
          element: (
            <ErrorBoundary screen="Policy Lab">
              <Lab />
            </ErrorBoundary>
          ),
        },
        {
          path: 'gallery',
          element: (
            <ErrorBoundary screen="Component gallery">
              <Gallery />
            </ErrorBoundary>
          ),
        },
        { path: '*', element: <Navigate to="/" replace /> },
      ],
    },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_skipActionErrorRevalidation: true,
    },
  },
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TooltipProvider>
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
      <CommandPalette />
      <Toaster />
    </TooltipProvider>
  </StrictMode>,
);
