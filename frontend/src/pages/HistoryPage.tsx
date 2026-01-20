import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  History,
  Loader2,
  ChevronDown,
  ChevronUp,
  Calendar,
  Trophy,
  Dumbbell,
  Clock,
} from "lucide-react";

import { api } from "@/lib/api";
import type { SessionAnalytics, SessionDetail, SessionSetDetail } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Group sets by exercise for display
 */
function groupSetsByExercise(sets: SessionSetDetail[]) {
  const grouped: Record<number, { name: string; sets: SessionSetDetail[] }> = {};

  for (const set of sets) {
    if (!grouped[set.exercise_definition_id]) {
      grouped[set.exercise_definition_id] = {
        name: set.exercise_name,
        sets: [],
      };
    }
    grouped[set.exercise_definition_id].sets.push(set);
  }

  return Object.values(grouped);
}

/**
 * Format a duration between two dates
 */
function formatDuration(startedAt: string, completedAt: string): string {
  const start = new Date(startedAt);
  const end = new Date(completedAt);
  const diffMs = end.getTime() - start.getTime();
  const diffMins = Math.round(diffMs / 60000);

  if (diffMins < 60) {
    return `${diffMins} min`;
  }

  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Expandable session card showing sets when clicked
 */
function SessionCard({ session }: { session: SessionAnalytics }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch session details when expanded
  const { data: sessionDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["session-detail", session.id],
    queryFn: async () => {
      const response = await api.get<SessionDetail>(
        `/analytics/sessions/${session.id}`
      );
      return response.data;
    },
    enabled: isExpanded,
  });

  const exerciseGroups = sessionDetail
    ? groupSetsByExercise(sessionDetail.sets)
    : [];

  const totalSets = sessionDetail?.sets.length ?? 0;

  return (
    <Card
      className={cn(
        "transition-all",
        isExpanded && "ring-2 ring-primary/20"
      )}
    >
      <CardContent className="p-0">
        {/* Header - always visible */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/50 transition-colors rounded-lg"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
              <Dumbbell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">
                {session.template_name ?? "Ad-hoc Workout"}
              </p>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(session.completed_at).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDuration(session.started_at, session.completed_at)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="flex items-center gap-1 text-lg font-bold">
                <Trophy className="h-4 w-4 text-yellow-500" />
                {session.session_score.toFixed(0)}
              </div>
              <p className="text-xs text-muted-foreground">Score</p>
            </div>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </button>

        {/* Expanded content */}
        {isExpanded && (
          <div className="px-4 pb-4 border-t">
            {detailLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : exerciseGroups.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">
                No sets recorded for this session.
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {/* Summary stats */}
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xl font-bold">{exerciseGroups.length}</p>
                    <p className="text-xs text-muted-foreground">Exercises</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xl font-bold">{totalSets}</p>
                    <p className="text-xs text-muted-foreground">Total Sets</p>
                  </div>
                </div>

                {/* Exercise breakdown */}
                <div className="space-y-3">
                  {exerciseGroups.map((group, index) => (
                    <div key={index} className="rounded-lg border p-3">
                      <h4 className="font-medium mb-2">{group.name}</h4>
                      <div className="space-y-1">
                        {group.sets.map((set) => (
                          <div
                            key={set.id}
                            className="flex justify-between text-sm py-1 px-2 rounded bg-muted/30"
                          >
                            <span className="text-muted-foreground">
                              Set {set.set_number}
                            </span>
                            <span>
                              <span className="font-medium">{set.weight}</span>
                              <span className="text-muted-foreground">kg</span>
                              {" × "}
                              <span className="font-medium">{set.reps}</span>
                              <span className="text-muted-foreground"> reps</span>
                            </span>
                            <span className="text-muted-foreground">
                              ({set.epley_score.toFixed(1)})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function HistoryPage() {
  // Fetch all completed sessions
  const {
    data: sessions,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["completed-sessions"],
    queryFn: async () => {
      const response = await api.get<SessionAnalytics[]>("/analytics/sessions");
      return response.data;
    },
  });

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load workout history</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <History className="h-6 w-6" />
          Workout History
        </h1>
        <p className="text-muted-foreground">
          View your completed workouts and progress
        </p>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && sessions?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <History className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No workouts yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Complete your first workout to see it here.
            </p>
            <Button asChild>
              <a href="/workout">Start a Workout</a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Session list */}
      {!isLoading && sessions && sessions.length > 0 && (
        <div className="space-y-3">
          {/* Summary stats */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{sessions.length}</p>
                  <p className="text-sm text-muted-foreground">Total Workouts</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {sessions
                      .reduce((acc, s) => acc + s.session_score, 0)
                      .toFixed(0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Score</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {(
                      sessions.reduce((acc, s) => acc + s.session_score, 0) /
                      sessions.length
                    ).toFixed(0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Avg Score</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Session cards */}
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}
