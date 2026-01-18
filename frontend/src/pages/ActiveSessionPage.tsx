import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  Loader2,
  Dumbbell,
  Trash2,
  Flag,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import {
  useSessionStore,
  calculateEstimatedScore,
  countValidSets,
  countCompletedExercises,
} from "@/stores/sessionStore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { SetRow, ExercisePicker, FinishWorkoutDialog } from "@/components/workout";

export default function ActiveSessionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const templateIdParam = searchParams.get("template");

  const {
    draft,
    currentExerciseIndex,
    isLoading,
    isSyncing,
    hasUnsyncedChanges,
    error,
    startWorkout,
    loadDraft,
    updateSet,
    addSet,
    removeSet,
    markExerciseDone,
    addAdHocExercise,
    goToExercise,
    goToNextExercise,
    goToPreviousExercise,
    finishWorkout,
    discardWorkout,
    clearError,
  } = useSessionStore();

  const [isExercisePickerOpen, setIsExercisePickerOpen] = useState(false);
  const [isFinishDialogOpen, setIsFinishDialogOpen] = useState(false);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);

  // Guard against double initialization in React StrictMode
  const isInitializing = useRef(false);

  // Load draft or start workout on mount
  useEffect(() => {
    // Prevent double initialization (React StrictMode calls useEffect twice)
    if (isInitializing.current) return;
    isInitializing.current = true;

    const initWorkout = async () => {
      try {
        const hasDraft = await loadDraft();

        // If no draft and we have a template ID, start a new workout
        if (!hasDraft && templateIdParam) {
          const templateId = parseInt(templateIdParam, 10);
          if (!isNaN(templateId)) {
            await startWorkout(templateId);
          }
        }
      } catch {
        // Error is already set in store
      }
    };

    initWorkout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle errors
  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  // Current exercise data
  const currentExercise = draft?.session_data.exercises[currentExerciseIndex];
  const totalExercises = draft?.session_data.exercises.length ?? 0;

  // Handle adding ad-hoc exercise
  const handleAddExercise = async (exerciseId: number) => {
    try {
      await addAdHocExercise(exerciseId);
      toast.success("Exercise added");
    } catch {
      // Error handled in store
    }
  };

  // Handle finishing workout
  const handleFinishWorkout = async () => {
    try {
      const completed = await finishWorkout();
      setIsFinishDialogOpen(false);
      toast.success(
        `Workout complete! Score: ${completed.session_score.toFixed(1)}`
      );
      navigate("/history");
    } catch {
      // Error handled in store
    }
  };

  // Handle discarding workout
  const handleDiscardWorkout = async () => {
    try {
      await discardWorkout();
      setIsDiscardDialogOpen(false);
      toast.success("Workout discarded");
      navigate("/");
    } catch {
      // Error handled in store
    }
  };

  // Handle set update with auto-add row
  const handleSetUpdate = (
    exerciseIndex: number,
    setIndex: number,
    data: Partial<{ reps: number | null; weight: number | null; completed: boolean }>
  ) => {
    updateSet(exerciseIndex, setIndex, data);

    // Auto-add new row if this is the last set and both fields have values
    const exercise = draft?.session_data.exercises[exerciseIndex];
    if (exercise) {
      const isLastSet = setIndex === exercise.sets.length - 1;
      const currentSet = exercise.sets[setIndex];

      if (isLastSet && currentSet) {
        const repsValue = data.reps !== undefined ? data.reps : currentSet.reps;
        const weightValue = data.weight !== undefined ? data.weight : currentSet.weight;

        if (repsValue !== null && weightValue !== null) {
          addSet(exerciseIndex);
        }
      }
    }
  };

  // Handle marking exercise as done
  const handleMarkDone = () => {
    markExerciseDone(currentExerciseIndex);

    // Move to next incomplete exercise if available
    const nextIncomplete = draft?.session_data.exercises.findIndex(
      (e, i) => i > currentExerciseIndex && !e.is_done
    );
    if (nextIncomplete !== undefined && nextIncomplete !== -1) {
      goToExercise(nextIncomplete);
    }
    toast.success("Exercise marked as done");
  };

  // Loading state
  if (isLoading && !draft) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No draft and no template - show start options
  if (!draft && !templateIdParam) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Start a Workout</h1>
          <p className="text-muted-foreground">
            Select a template from your active split or start an empty workout
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Dumbbell className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No workout in progress</h3>
            <p className="text-muted-foreground text-center mb-4">
              Go to the Dashboard to select a template and start your workout.
            </p>
            <div className="flex gap-3">
              <Button asChild>
                <Link to="/">Go to Dashboard</Link>
              </Button>
              <Button
                variant="outline"
                onClick={() => startWorkout()}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Empty Workout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main workout UI
  return (
    <div className="space-y-4 pb-24">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Active Workout</h1>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <span>
              {countCompletedExercises(draft)}/{totalExercises} exercises done
            </span>
            {(isSyncing || hasUnsyncedChanges) && (
              <span className="flex items-center gap-1">
                {isSyncing ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3" />
                    Unsaved
                  </>
                )}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDiscardDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExercisePickerOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </div>

      {/* Exercise Navigator - Horizontal scrollable pills */}
      {totalExercises > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {draft?.session_data.exercises.map((exercise, index) => (
            <button
              key={`${exercise.definition_id}-${index}`}
              onClick={() => goToExercise(index)}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                index === currentExerciseIndex
                  ? "bg-primary text-primary-foreground"
                  : exercise.is_done
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {exercise.is_done && <Check className="inline h-3 w-3 mr-1" />}
              {exercise.name}
            </button>
          ))}
        </div>
      )}

      {/* Current Exercise Card */}
      {currentExercise ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToPreviousExercise}
                  disabled={currentExerciseIndex === 0}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {currentExercise.name}
                    {currentExercise.is_done && (
                      <span className="text-green-600">
                        <Check className="h-5 w-5" />
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Exercise {currentExerciseIndex + 1} of {totalExercises}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToNextExercise}
                  disabled={currentExerciseIndex === totalExercises - 1}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
              <Button
                variant={currentExercise.is_done ? "secondary" : "default"}
                size="sm"
                onClick={handleMarkDone}
                disabled={currentExercise.is_done}
              >
                <Flag className="h-4 w-4 mr-1" />
                {currentExercise.is_done ? "Done" : "Mark Done"}
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {/* Sets Table */}
            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground px-2">
                <div className="col-span-1 text-center">Set</div>
                <div className="col-span-4">Reps</div>
                <div className="col-span-4">Weight</div>
                <div className="col-span-1 text-center">✓</div>
                <div className="col-span-2"></div>
              </div>

              {/* Set Rows */}
              {currentExercise.sets.map((set, setIndex) => (
                <SetRow
                  key={setIndex}
                  exerciseIndex={currentExerciseIndex}
                  setIndex={setIndex}
                  setData={set}
                  isOnlySet={currentExercise.sets.length === 1}
                  isExerciseDone={currentExercise.is_done}
                  onUpdate={handleSetUpdate}
                  onRemove={removeSet}
                />
              ))}

              {/* Add Set Button */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2"
                onClick={() => addSet(currentExerciseIndex)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Set
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Dumbbell className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No exercises yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add an exercise to get started
            </p>
            <Button onClick={() => setIsExercisePickerOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Exercise
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Workout Summary Card */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{countValidSets(draft)}</p>
              <p className="text-sm text-muted-foreground">Total Sets</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {countCompletedExercises(draft)}
              </p>
              <p className="text-sm text-muted-foreground">Exercises Done</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {calculateEstimatedScore(draft).toFixed(0)}
              </p>
              <p className="text-sm text-muted-foreground">Est. Score</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Finish Workout Button - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t md:left-64">
        <div className="max-w-4xl mx-auto">
          <Button
            className="w-full"
            size="lg"
            onClick={() => setIsFinishDialogOpen(true)}
            disabled={isLoading || countValidSets(draft) === 0}
          >
            <Check className="mr-2 h-5 w-5" />
            Finish Workout
          </Button>
        </div>
      </div>

      {/* Exercise Picker Dialog */}
      <ExercisePicker
        open={isExercisePickerOpen}
        onOpenChange={setIsExercisePickerOpen}
        draft={draft}
        isLoading={isLoading}
        onSelectExercise={handleAddExercise}
      />

      {/* Finish Workout Confirmation Dialog */}
      <FinishWorkoutDialog
        open={isFinishDialogOpen}
        onOpenChange={setIsFinishDialogOpen}
        draft={draft}
        isLoading={isLoading}
        onConfirm={handleFinishWorkout}
      />

      {/* Discard Workout Confirmation Dialog */}
      <Dialog open={isDiscardDialogOpen} onOpenChange={setIsDiscardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard Workout?</DialogTitle>
            <DialogDescription>
              Are you sure you want to discard this workout? All progress will
              be lost and this action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDiscardDialogOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDiscardWorkout}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Discard Workout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
