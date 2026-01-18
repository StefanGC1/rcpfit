import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Loader2, Dumbbell } from "lucide-react";
import { toast } from "sonner";
import { AxiosError } from "axios";

import { api } from "@/lib/api";
import type { Exercise } from "@/types";
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
                  {/* Edit button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingExercise(exercise)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {/* Delete button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletingExercise(exercise)}
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
    </div>
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
