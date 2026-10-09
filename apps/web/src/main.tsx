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

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/gallery" replace /> },
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
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TooltipProvider>
      <RouterProvider router={router} />
      <CommandPalette />
      <Toaster />
    </TooltipProvider>
  </StrictMode>,
);
