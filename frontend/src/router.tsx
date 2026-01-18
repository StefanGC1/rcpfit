import { createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

// Auth pages (public)
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";

// App pages (protected)
import DashboardPage from "@/pages/DashboardPage";
import SplitsPage from "@/pages/SplitsPage";
import SplitDetailPage from "@/pages/SplitDetailPage";
import ExercisesPage from "@/pages/ExercisesPage";
import ActiveSessionPage from "@/pages/ActiveSessionPage";
import HistoryPage from "@/pages/HistoryPage";
import AnalyticsPage from "@/pages/AnalyticsPage";

export const router = createBrowserRouter([
  // Public routes
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },

  // Protected routes (wrapped in AppLayout)
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppLayout>
          <DashboardPage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/splits",
    element: (
      <ProtectedRoute>
        <AppLayout>
          <SplitsPage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/splits/:id",
    element: (
      <ProtectedRoute>
        <AppLayout>
          <SplitDetailPage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/exercises",
    element: (
      <ProtectedRoute>
        <AppLayout>
          <ExercisesPage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/workout",
    element: (
      <ProtectedRoute>
        <AppLayout>
          <ActiveSessionPage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/history",
    element: (
      <ProtectedRoute>
        <AppLayout>
          <HistoryPage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/analytics",
    element: (
      <ProtectedRoute>
        <AppLayout>
          <AnalyticsPage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
]);
