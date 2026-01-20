import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Loader2, TrendingUp, Dumbbell } from "lucide-react";

import { api } from "@/lib/api";
import type {
  SessionAnalytics,
  Exercise,
  ExerciseSessionHistory,
  Template,
} from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SessionScoreChart, ExerciseProgressChart } from "@/components/charts";

// Custom Select component using native select for reliability
interface SelectOption {
  value: string;
  label: string;
}

function NativeSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {placeholder && (
        <option value="" disabled={false}>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export default function AnalyticsPage() {
  // State for filters
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>("");

  // Fetch all templates with their exercises
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["all-templates"],
    queryFn: async () => {
      const response = await api.get<Template[]>("/templates");
      return response.data;
    },
  });

  // Fetch exercises
  const { data: exercises, isLoading: exercisesLoading } = useQuery({
    queryKey: ["exercises"],
    queryFn: async () => {
      const response = await api.get<Exercise[]>("/exercises");
      return response.data;
    },
  });

  // Fetch session analytics (with optional template filter)
  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ["analytics-sessions", selectedTemplateId],
    queryFn: async () => {
      const url = selectedTemplateId
        ? `/analytics/sessions?template_id=${selectedTemplateId}`
        : "/analytics/sessions";
      const response = await api.get<SessionAnalytics[]>(url);
      return response.data;
    },
  });

  // Fetch exercise history when exercise is selected
  const { data: exerciseHistory, isLoading: exerciseHistoryLoading } = useQuery(
    {
      queryKey: ["exercise-history", selectedExerciseId],
      queryFn: async () => {
        const response = await api.get<ExerciseSessionHistory[]>(
          `/analytics/exercise/${selectedExerciseId}/history`
        );
        return response.data;
      },
      enabled: !!selectedExerciseId,
    }
  );

  // Build template options for dropdown
  const templateOptions: SelectOption[] = [
    { value: "", label: "All Sessions" },
    ...(templates?.map((t) => ({
      value: t.id.toString(),
      label: t.name,
    })) ?? []),
  ];

  // Build exercise options for dropdown
  const exerciseOptions: SelectOption[] = [
    { value: "", label: "Select an exercise..." },
    ...(exercises?.map((e) => ({
      value: e.id.toString(),
      label: e.name,
    })) ?? []),
  ];

  // Transform session data for chart
  const sessionChartData =
    sessions?.map((s) => ({
      date: s.completed_at,
      score: s.session_score,
      label: s.template_name ?? "Ad-hoc",
    })) ?? [];

  // Get selected exercise name for chart title
  const selectedExerciseName = exercises?.find(
    (e) => e.id.toString() === selectedExerciseId
  )?.name;

  const isLoading = templatesLoading || exercisesLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Analytics
        </h1>
        <p className="text-muted-foreground">
          Track your performance and progress over time
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* Session Score Over Time Section */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Session Progress
                </CardTitle>
                <div className="w-full sm:w-64">
                  <Label htmlFor="template-filter" className="sr-only">
                    Filter by Template
                  </Label>
                  <NativeSelect
                    value={selectedTemplateId}
                    onChange={setSelectedTemplateId}
                    options={templateOptions}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {sessionsLoading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : sessionChartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mb-4" />
                  <p>No session data available yet.</p>
                  <p className="text-sm">
                    Complete some workouts to see your progress!
                  </p>
                </div>
              ) : (
                <SessionScoreChart
                  data={sessionChartData}
                  showCard={false}
                  height={300}
                />
              )}
              {sessions && sessions.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-4 text-center border-t pt-4">
                  <div>
                    <p className="text-xl font-bold">{sessions.length}</p>
                    <p className="text-xs text-muted-foreground">Sessions</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold">
                      {Math.max(...sessions.map((s) => s.session_score)).toFixed(
                        0
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">Best Score</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold">
                      {(
                        sessions.reduce((acc, s) => acc + s.session_score, 0) /
                        sessions.length
                      ).toFixed(0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Average</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Exercise Performance Section */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <Dumbbell className="h-5 w-5" />
                  Exercise Progress
                </CardTitle>
                <div className="w-full sm:w-64">
                  <Label htmlFor="exercise-filter" className="sr-only">
                    Select Exercise
                  </Label>
                  <NativeSelect
                    value={selectedExerciseId}
                    onChange={setSelectedExerciseId}
                    options={exerciseOptions}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!selectedExerciseId ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                  <Dumbbell className="h-12 w-12 mb-4" />
                  <p>Select an exercise to view its progress</p>
                </div>
              ) : exerciseHistoryLoading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !exerciseHistory || exerciseHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                  <Dumbbell className="h-12 w-12 mb-4" />
                  <p>No history for this exercise yet.</p>
                  <p className="text-sm">
                    Start logging {selectedExerciseName} to track progress!
                  </p>
                </div>
              ) : (
                <>
                  <ExerciseProgressChart
                    data={exerciseHistory}
                    exerciseName={selectedExerciseName}
                    showCard={false}
                    height={300}
                  />
                  <div className="mt-4 grid grid-cols-3 gap-4 text-center border-t pt-4">
                    <div>
                      <p className="text-xl font-bold">
                        {exerciseHistory.length}
                      </p>
                      <p className="text-xs text-muted-foreground">Sessions</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold">
                        {Math.max(
                          ...exerciseHistory.map((h) => h.total_score)
                        ).toFixed(0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Best Score</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold">
                        {exerciseHistory
                          .reduce((acc, h) => acc + h.sets.length, 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Total Sets</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
