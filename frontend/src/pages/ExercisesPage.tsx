import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Dumbbell,
  TrendingUp,
  Calendar,
  Trophy,
  Target,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { AxiosError } from "axios";

import { api } from "@/lib/api";
import type { Exercise, ExerciseSummary, ExerciseSessionHistory } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { ExerciseProgressChart } from "@/components/charts";

// Validation schema for exercise form
const exerciseSchema = z.object({
  name: z
    .string()
    .min(1, "Exercise name is required")
    .max(100, "Exercise name must be less than 100 characters"),
});

type ExerciseFormValues = z.infer<typeof exerciseSchema>;

export default function ExercisesPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [deletingExercise, setDeletingExercise] = useState<Exercise | null>(
    null
  );
  const [viewingExercise, setViewingExercise] = useState<Exercise | null>(null);

  // Fetch exercises
  const {
    data: exercises,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["exercises"],
    queryFn: async () => {
      const response = await api.get<Exercise[]>("/exercises");
      return response.data;
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: ExerciseFormValues) => {
      const response = await api.post<Exercise>("/exercises", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      setIsCreateOpen(false);
      toast.success("Exercise created successfully");
    },
    onError: (error: AxiosError<{ detail: string }>) => {
      const message =
        error.response?.data?.detail ?? "Failed to create exercise";
      toast.error(message);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: ExerciseFormValues;
    }) => {
      const response = await api.put<Exercise>(`/exercises/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      setEditingExercise(null);
      toast.success("Exercise updated successfully");
    },
    onError: (error: AxiosError<{ detail: string }>) => {
      const message =
        error.response?.data?.detail ?? "Failed to update exercise";
      toast.error(message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/exercises/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
      setDeletingExercise(null);
      toast.success("Exercise deleted successfully");
    },
    onError: (error: AxiosError<{ detail: string }>) => {
      const message =
        error.response?.data?.detail ?? "Failed to delete exercise";
      toast.error(message);
    },
  });

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load exercises</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Exercises</h1>
          <p className="text-muted-foreground">
            Manage your personal exercise library
          </p>
        </div>

        {/* Create Exercise Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Exercise
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Exercise</DialogTitle>
              <DialogDescription>
                Create a new exercise to add to your library.
              </DialogDescription>
            </DialogHeader>
            <ExerciseForm
              onSubmit={(data) => createMutation.mutate(data)}
              isLoading={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && exercises?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Dumbbell className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No exercises yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Start building your exercise library by adding your first
              exercise.
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Exercise
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Exercise list */}
      {!isLoading && exercises && exercises.length > 0 && (
        <div className="grid gap-2">
          {exercises.map((exercise) => (
            <Card key={exercise.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{exercise.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Added {new Date(exercise.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* View Stats button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setViewingExercise(exercise)}
                    title="View Stats"
                  >
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                  {/* Edit button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingExercise(exercise)}
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {/* Delete button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletingExercise(exercise)}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Exercise Dialog */}
      <Dialog
        open={editingExercise !== null}
        onOpenChange={(open) => !open && setEditingExercise(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Exercise</DialogTitle>
            <DialogDescription>
              Update the exercise name.
            </DialogDescription>
          </DialogHeader>
          {editingExercise && (
            <ExerciseForm
              defaultValues={{ name: editingExercise.name }}
              onSubmit={(data) =>
                updateMutation.mutate({ id: editingExercise.id, data })
              }
              isLoading={updateMutation.isPending}
              submitLabel="Save Changes"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deletingExercise !== null}
        onOpenChange={(open) => !open && setDeletingExercise(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Exercise</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingExercise?.name}"? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingExercise(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deletingExercise && deleteMutation.mutate(deletingExercise.id)
              }
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exercise Detail/Stats Dialog */}
      <Dialog
        open={viewingExercise !== null}
        onOpenChange={(open) => !open && setViewingExercise(null)}
      >
        <DialogContent className="max-w-2xl">
          {viewingExercise && (
            <ExerciseDetailView
              exercise={viewingExercise}
              onClose={() => setViewingExercise(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Exercise Detail View Component
interface ExerciseDetailViewProps {
  exercise: Exercise;
  onClose: () => void;
}

function ExerciseDetailView({ exercise }: ExerciseDetailViewProps) {
  // Fetch exercise summary
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["exercise-summary", exercise.id],
    queryFn: async () => {
      const response = await api.get<ExerciseSummary>(
        `/analytics/exercise/${exercise.id}/summary`
      );
      return response.data;
    },
  });

  // Fetch exercise history for chart
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["exercise-history", exercise.id],
    queryFn: async () => {
      const response = await api.get<ExerciseSessionHistory[]>(
        `/analytics/exercise/${exercise.id}/history`
      );
      return response.data;
    },
  });

  const isLoading = summaryLoading || historyLoading;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Dumbbell className="h-5 w-5" />
          {exercise.name}
        </DialogTitle>
        <DialogDescription>
          Performance statistics and progress over time
        </DialogDescription>
      </DialogHeader>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Stats */}
          {summary && summary.total_sessions > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="flex justify-center mb-1">
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xl font-bold">{summary.total_sessions}</p>
                  <p className="text-xs text-muted-foreground">Sessions</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="flex justify-center mb-1">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xl font-bold">{summary.total_sets}</p>
                  <p className="text-xs text-muted-foreground">Total Sets</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="flex justify-center mb-1">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                  </div>
                  <p className="text-xl font-bold">
                    {summary.best_set_epley_score.toFixed(0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Best Score</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="flex justify-center mb-1">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xl font-bold">
                    {summary.average_session_score.toFixed(0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Avg Score</p>
                </div>
              </div>

              {/* Personal Best Info */}
              <div className="rounded-lg border p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  Personal Best Set
                </h4>
                <p className="text-2xl font-bold">
                  {summary.best_set_weight}kg × {summary.best_set_reps} reps
                </p>
                <p className="text-sm text-muted-foreground">
                  Epley Score: {summary.best_set_epley_score.toFixed(1)}
                </p>
              </div>

              {/* Last Performed */}
              {summary.last_performed && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Last performed:{" "}
                    {new Date(summary.last_performed).toLocaleDateString(
                      "en-US",
                      {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }
                    )}
                  </span>
                </div>
              )}

              {/* Progress Chart */}
              {history && history.length > 0 && (
                <ExerciseProgressChart
                  data={history}
                  exerciseName={exercise.name}
                  title="Score Progress"
                  height={250}
                  showCard={false}
                />
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Dumbbell className="h-12 w-12 mb-4" />
              <p>No history for this exercise yet.</p>
              <p className="text-sm">
                Start logging sets to track your progress!
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// Reusable form component for create/edit
interface ExerciseFormProps {
  defaultValues?: ExerciseFormValues;
  onSubmit: (data: ExerciseFormValues) => void;
  isLoading: boolean;
  submitLabel?: string;
}

function ExerciseForm({
  defaultValues = { name: "" },
  onSubmit,
  isLoading,
  submitLabel = "Create Exercise",
}: ExerciseFormProps) {
  const form = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseSchema),
    defaultValues,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Exercise Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Bench Press"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
