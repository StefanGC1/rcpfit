import { Loader2, Trophy, Dumbbell, Target } from "lucide-react";

import type { WorkoutDraft } from "@/types";
import {
  calculateEstimatedScore,
  countValidSets,
  countCompletedExercises,
} from "@/stores/sessionStore";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FinishWorkoutDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to change open state */
  onOpenChange: (open: boolean) => void;
  /** Current workout draft */
  draft: WorkoutDraft | null;
  /** Whether finish operation is in progress */
  isLoading: boolean;
  /** Callback when user confirms finishing */
  onConfirm: () => Promise<void>;
}

/**
 * Confirmation dialog for finishing a workout.
 * Shows a summary of the workout including exercise count, set count, and estimated score.
 */
export function FinishWorkoutDialog({
  open,
  onOpenChange,
  draft,
  isLoading,
  onConfirm,
}: FinishWorkoutDialogProps) {
  const totalExercises = draft?.session_data.exercises.length ?? 0;
  const completedExercises = countCompletedExercises(draft);
  const validSets = countValidSets(draft);
  const estimatedScore = calculateEstimatedScore(draft);

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Finish Workout?
          </DialogTitle>
          <DialogDescription>
            Your workout will be saved and you'll be able to view it in your
            history.
          </DialogDescription>
        </DialogHeader>

        {/* Workout Summary Stats */}
        <div className="py-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            {/* Exercises */}
            <div className="p-4 rounded-lg bg-muted">
              <div className="flex justify-center mb-2">
                <Dumbbell className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold">{totalExercises}</p>
              <p className="text-xs text-muted-foreground">
                Exercises
                {completedExercises > 0 && (
                  <span className="block text-green-600">
                    ({completedExercises} marked done)
                  </span>
                )}
              </p>
            </div>

            {/* Sets */}
            <div className="p-4 rounded-lg bg-muted">
              <div className="flex justify-center mb-2">
                <Target className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold">{validSets}</p>
              <p className="text-xs text-muted-foreground">Valid Sets</p>
            </div>

            {/* Score */}
            <div className="p-4 rounded-lg bg-muted">
              <div className="flex justify-center mb-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
              </div>
              <p className="text-2xl font-bold">{estimatedScore.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">Est. Score</p>
            </div>
          </div>

          {/* Warning if no valid sets */}
          {validSets === 0 && (
            <p className="text-sm text-amber-600 text-center mt-4">
              ⚠️ No valid sets recorded. Add reps and weight to at least one
              set.
            </p>
          )}

          {/* Info about what gets saved */}
          <p className="text-xs text-muted-foreground text-center mt-4">
            Only sets with both reps and weight entered will be saved.
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || validSets === 0}
            className="w-full sm:w-auto"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Trophy className="mr-2 h-4 w-4" />
                Finish Workout
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
