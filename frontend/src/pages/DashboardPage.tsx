import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Dumbbell,
  Play,
  Layers,
  ListChecks,
  ChevronRight,
  Loader2,
  Clock,
  Star,
} from "lucide-react";

import { api } from "@/lib/api";
import type { Split, WorkoutDraft } from "@/types";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Type for basic split info
interface SplitBasic {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
}

export default function DashboardPage() {
  const { user } = useAuthStore();

  // Fetch all splits to find the active one
  const { data: splits, isLoading: splitsLoading } = useQuery({
    queryKey: ["splits"],
    queryFn: async () => {
      const response = await api.get<SplitBasic[]>("/splits");
      return response.data;
    },
  });

  // Fetch active split with templates
  const activeSplit = splits?.find((s) => s.is_active);

  const { data: activeSplitDetails, isLoading: activeSplitLoading } = useQuery({
    queryKey: ["splits", activeSplit?.id],
    queryFn: async () => {
      const response = await api.get<Split>(`/splits/${activeSplit!.id}`);
      return response.data;
    },
    enabled: !!activeSplit?.id,
  });

  // Check for workout draft (for Phase 4 - just a placeholder check for now)
  const { data: workoutDraft } = useQuery({
    queryKey: ["workoutDraft"],
    queryFn: async () => {
      try {
        const response = await api.get<WorkoutDraft>("/workouts/draft");
        return response.data;
      } catch {
        // No draft exists
        return null;
      }
    },
    retry: false,
  });

  const isLoading = splitsLoading || activeSplitLoading;

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}!
        </h1>
        <p className="text-muted-foreground">
          Ready to crush your workout today?
        </p>
      </div>

      {/* Resume workout banner (if draft exists) */}
      {workoutDraft && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Workout in progress</p>
                <p className="text-sm text-muted-foreground">
                  Started{" "}
                  {new Date(workoutDraft.started_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <Button asChild>
              <Link to="/workout">
                Resume Workout
                <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick stats / actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Quick Actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/exercises">
                <ListChecks className="mr-2 h-4 w-4" />
                Manage Exercises
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/splits">
                <Layers className="mr-2 h-4 w-4" />
                Manage Splits
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="flex items-center gap-2">
                <Star className="h-4 w-4 fill-primary text-primary" />
                Active Split
              </CardDescription>
              {activeSplit && (
                <Button asChild variant="ghost" size="sm">
                  <Link to={`/splits/${activeSplit.id}`}>
                    View Details
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
            {activeSplit ? (
              <CardTitle>{activeSplit.name}</CardTitle>
            ) : (
              <CardTitle className="text-muted-foreground">
                No active split
              </CardTitle>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !activeSplit ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-3">
                  Set a split as active to see your workout templates here.
                </p>
                <Button asChild variant="outline">
                  <Link to="/splits">Go to Splits</Link>
                </Button>
              </div>
            ) : activeSplitDetails?.templates?.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-3">
                  This split has no templates yet.
                </p>
                <Button asChild variant="outline">
                  <Link to={`/splits/${activeSplit.id}`}>Add Templates</Link>
                </Button>
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">
                {activeSplitDetails?.templates?.length ?? 0} template
                {(activeSplitDetails?.templates?.length ?? 0) !== 1 && "s"}{" "}
                available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Start Workout Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            Start a Workout
          </CardTitle>
          <CardDescription>
            {activeSplit
              ? "Choose a template to begin your workout session"
              : "Set an active split to start working out"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !activeSplit ? (
            <div className="text-center py-8">
              <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                Create a split and set it as active to start working out.
              </p>
              <Button asChild>
                <Link to="/splits">
                  <Layers className="mr-2 h-4 w-4" />
                  Go to Splits
                </Link>
              </Button>
            </div>
          ) : activeSplitDetails?.templates?.length === 0 ? (
            <div className="text-center py-8">
              <ListChecks className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                Add templates to your active split to start working out.
              </p>
              <Button asChild>
                <Link to={`/splits/${activeSplit.id}`}>
                  <ListChecks className="mr-2 h-4 w-4" />
                  Add Templates
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {activeSplitDetails?.templates?.map((template) => (
                <Button
                  key={template.id}
                  variant="outline"
                  className="h-auto py-4 flex-col items-start text-left"
                  asChild
                >
                  <Link to={`/workout?template=${template.id}`}>
                    <div className="flex items-center gap-2 w-full">
                      <Play className="h-4 w-4 text-primary" />
                      <span className="font-medium">{template.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground mt-1">
                      {template.exercises?.length ?? 0} exercise
                      {(template.exercises?.length ?? 0) !== 1 && "s"}
                    </span>
                  </Link>
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
