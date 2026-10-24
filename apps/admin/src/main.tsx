import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';
import './index.css';
import './fonts.ts';
import { AuthProvider, useAuth } from './auth/AuthContext.tsx';
import { Layout } from './components/Layout.tsx';
import { FeedbackProvider, Loading } from './components/ui.tsx';
import { AccommodationEditPage } from './pages/AccommodationEditPage.tsx';
import { AccommodationsPage } from './pages/AccommodationsPage.tsx';
import { BookingsPage } from './pages/BookingsPage.tsx';
import { CalendarPage } from './pages/CalendarPage.tsx';
import { ChannelsPage } from './pages/ChannelsPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { DesignPage } from './pages/DesignPage.tsx';
import { ExtrasPage } from './pages/ExtrasPage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { MediaPage } from './pages/MediaPage.tsx';
import { PageEditPage } from './pages/PageEditPage.tsx';
import { PagesPage } from './pages/PagesPage.tsx';
import { SeasonsPage } from './pages/SeasonsPage.tsx';
import { UsersPage } from './pages/UsersPage.tsx';

function Protected() {
  const { user, checking } = useAuth();
  if (checking) return <Loading label="Prüfe Anmeldung …" />;
  if (!user) return <LoginPage />;
  return <Layout />;
}

function AdminOnly({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth();
  return isAdmin ? children : <Navigate to="/" replace />;
}

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <Protected />,
      children: [
        { index: true, element: <DashboardPage /> },
        { path: 'kalender', element: <CalendarPage /> },
        { path: 'buchungen', element: <BookingsPage /> },
        { path: 'unterkuenfte', element: <AccommodationsPage /> },
        { path: 'unterkuenfte/neu', element: <AccommodationEditPage /> },
        { path: 'unterkuenfte/saisons', element: <SeasonsPage /> },
        { path: 'unterkuenfte/zusatzleistungen', element: <ExtrasPage /> },
        { path: 'unterkuenfte/:id', element: <AccommodationEditPage /> },
        {
          path: 'kanaele',
          element: (
            <AdminOnly>
              <ChannelsPage />
            </AdminOnly>
          ),
        },
        { path: 'inhalte', element: <PagesPage /> },
        { path: 'inhalte/:slug', element: <PageEditPage /> },
        { path: 'design', element: <DesignPage /> },
        { path: 'medien', element: <MediaPage /> },
        {
          path: 'benutzer',
          element: (
            <AdminOnly>
              <UsersPage />
            </AdminOnly>
          ),
        },
        { path: '*', element: <Navigate to="/" replace /> },
      ],
    },
  ],
  { basename: '/admin' },
);

const root = document.getElementById('root');
if (!root) throw new Error('#root fehlt in index.html');

createRoot(root).render(
  <StrictMode>
    <FeedbackProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </FeedbackProvider>
  </StrictMode>,
);
