import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that protects routes requiring authentication.
 * Redirects to /login if the user is not authenticated.
 * Preserves the intended destination in location state for redirect after login.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, token } = useAuthStore();
  const location = useLocation();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Check if already hydrated
    if (useAuthStore.persist.hasHydrated()) {
      setIsHydrated(true);
    } else {
      // Wait for hydration to complete
      const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
        setIsHydrated(true);
      });
      return () => {
        unsubscribe();
      };
    }
  }, []);

  // Wait for hydration before making auth decisions
  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // After hydration, check if we have a token (isAuthenticated should be set by now)
  if (!isAuthenticated && !token) {
    // Redirect to login page, preserving the intended destination
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
