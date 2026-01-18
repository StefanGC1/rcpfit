import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Dumbbell,
  LayoutDashboard,
  Layers,
  ListChecks,
  Play,
  History,
  BarChart3,
  LogOut,
  User,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Splits", href: "/splits", icon: Layers },
  { label: "Exercises", href: "/exercises", icon: ListChecks },
  { label: "Workout", href: "/workout", icon: Play },
  { label: "History", href: "/history", icon: History },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
];

/**
 * Main application layout with sidebar navigation.
 * Used for all authenticated pages.
 */
export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const { user, token, logout, loadUser } = useAuthStore();

  // Load user data if we have a token but no user (e.g., after page refresh)
  useEffect(() => {
    if (token && !user) {
      loadUser().catch(() => {
        // Error handled in loadUser
      });
    }
  }, [token, user, loadUser]);

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen flex bg-muted/40">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-card border-r">
        {/* Logo */}
        <div className="p-6">
          <Link to="/" className="flex items-center gap-2 text-primary">
            <Dumbbell className="h-8 w-8" />
            <span className="text-xl font-bold">RCPFit</span>
          </Link>
        </div>

        <Separator />

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User section at bottom */}
        <div className="p-4 border-t">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 px-3"
              >
                <User className="h-5 w-5" />
                <span className="flex-1 text-left truncate">
                  {user?.email ?? "User"}
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col">
        <header className="md:hidden flex items-center justify-between border-b bg-card px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-primary">
            <Dumbbell className="h-6 w-6" />
            <span className="text-lg font-bold">RCPFit</span>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{user?.email ?? "User"}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {navItems.map((item) => (
                <DropdownMenuItem key={item.href} asChild>
                  <Link to={item.href} className="flex items-center">
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Main content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
