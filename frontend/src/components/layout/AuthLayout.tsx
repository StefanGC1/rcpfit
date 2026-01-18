import { Dumbbell } from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

/**
 * Minimal layout for authentication pages (login/register).
 * Centers the content and provides a consistent branding header.
 */
export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/40 px-4 py-12">
      {/* Branding */}
      <div className="mb-8 flex flex-col items-center space-y-2">
        <div className="flex items-center gap-2 text-primary">
          <Dumbbell className="h-10 w-10" />
          <span className="text-3xl font-bold">RCPFit</span>
        </div>
        <p className="text-muted-foreground text-sm">
          Your personal workout planner and tracker
        </p>
      </div>

      {/* Auth card */}
      <div className="w-full max-w-md">
        <div className="bg-card rounded-lg border shadow-sm p-6 space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
