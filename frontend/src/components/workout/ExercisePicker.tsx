import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Loader2, Search } from "lucide-react";

import { api } from "@/lib/api";
import type { Exercise, WorkoutDraft } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ExercisePickerProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to change open state */
  onOpenChange: (open: boolean) => void;
  /** Current workout draft (to exclude already added exercises) */
  draft: WorkoutDraft | null;
  /** Whether an operation is in progress */
  isLoading: boolean;
  /** Callback when an exercise is selected */
  onSelectExercise: (exerciseId: number) => Promise<void>;
}

/**
 * Dialog for selecting an exercise to add to the current workout.
 * Fetches user's exercise definitions and provides search/filter functionality.
 */
export function ExercisePicker({
  open,
  onOpenChange,
  draft,
  isLoading,
  onSelectExercise,
}: ExercisePickerProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch user's exercise definitions
  const { data: exercises, isLoading: exercisesLoading } = useQuery({
    queryKey: ["exercises"],
    queryFn: async () => {
      const response = await api.get<Exercise[]>("/exercises");
      return response.data;
    },
    enabled: open, // Only fetch when dialog is open
  });

  // Get IDs of exercises already in the workout
  const addedExerciseIds = new Set(
    draft?.session_data.exercises.map((e) => e.definition_id) ?? []
  );

  // Filter exercises based on search and exclude already added ones
  const availableExercises =
    exercises?.filter(
      (exercise) =>
        !addedExerciseIds.has(exercise.id) &&
        exercise.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) ?? [];

  const handleSelect = async (exerciseId: number) => {
    try {
      await onSelectExercise(exerciseId);
      setSearchQuery("");
      onOpenChange(false);
    } catch {
      // Error handling is done in the parent
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSearchQuery("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Exercise</DialogTitle>
          <DialogDescription>
            Select an exercise to add to your workout
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search exercises..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          {/* Exercise List */}
          <div className="max-h-75 overflow-y-auto space-y-2">
            {exercisesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : availableExercises.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">
                  {exercises?.length === 0 ? (
                    <>
                      No exercises in your library.{" "}
                      <Link
                        to="/exercises"
                        className="text-primary underline hover:no-underline"
                        onClick={() => handleOpenChange(false)}
                      >
                        Create some first
                      </Link>
                    </>
                  ) : searchQuery ? (
                    "No matching exercises found"
                  ) : (
                    "All exercises are already in this workout"
                  )}
                </p>
              </div>
            ) : (
              availableExercises.map((exercise) => (
                <Button
                  key={exercise.id}
                  variant="outline"
                  className="w-full justify-start font-normal"
                  onClick={() => handleSelect(exercise.id)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {exercise.name}
                </Button>
              ))
            )}
          </div>

          {/* Exercise Count Info */}
          {exercises && exercises.length > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              {availableExercises.length} of {exercises.length} exercises
              available
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
