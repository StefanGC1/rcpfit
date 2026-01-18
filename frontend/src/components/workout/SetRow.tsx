import { X, Check } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { SetData } from "@/types";

interface SetRowProps {
  /** Index of the exercise in the workout */
  exerciseIndex: number;
  /** Index of this set within the exercise */
  setIndex: number;
  /** The set data (reps, weight, completed) */
  setData: SetData;
  /** Whether this is the only set (can't be removed) */
  isOnlySet: boolean;
  /** Whether the exercise is marked as done */
  isExerciseDone: boolean;
  /** Callback when set data changes */
  onUpdate: (
    exerciseIndex: number,
    setIndex: number,
    data: Partial<SetData>
  ) => void;
  /** Callback to remove this set */
  onRemove: (exerciseIndex: number, setIndex: number) => void;
}

/**
 * A single row in the sets table for logging reps and weight.
 * Shows set number, reps input, weight input, completed checkbox, and remove button.
 */
export function SetRow({
  exerciseIndex,
  setIndex,
  setData,
  isOnlySet,
  isExerciseDone,
  onUpdate,
  onRemove,
}: SetRowProps) {
  const isValid = setData.reps !== null && setData.weight !== null;
  const isComplete =
    isValid && setData.reps! > 0 && setData.weight! > 0;

  const handleRepsChange = (value: string) => {
    const numValue = value === "" ? null : parseInt(value, 10);
    onUpdate(exerciseIndex, setIndex, { reps: numValue });
  };

  const handleWeightChange = (value: string) => {
    const numValue = value === "" ? null : parseFloat(value);
    onUpdate(exerciseIndex, setIndex, { weight: numValue });
  };

  const handleCompletedChange = (checked: boolean) => {
    onUpdate(exerciseIndex, setIndex, { completed: checked });
  };

  return (
    <div
      className={cn(
        "grid grid-cols-12 gap-2 items-center p-2 rounded-md transition-colors",
        isComplete
          ? "bg-green-50 dark:bg-green-950/20"
          : "bg-muted/50"
      )}
    >
      {/* Set Number */}
      <div className="col-span-1 text-sm font-medium text-center">
        {setIndex + 1}
      </div>

      {/* Reps Input */}
      <div className="col-span-4">
        <Input
          type="number"
          inputMode="numeric"
          placeholder="Reps"
          value={setData.reps ?? ""}
          onChange={(e) => handleRepsChange(e.target.value)}
          className="h-9"
          min={0}
          disabled={isExerciseDone}
        />
      </div>

      {/* Weight Input */}
      <div className="col-span-4">
        <Input
          type="number"
          inputMode="decimal"
          placeholder="kg"
          value={setData.weight ?? ""}
          onChange={(e) => handleWeightChange(e.target.value)}
          className="h-9"
          min={0}
          step={0.5}
          disabled={isExerciseDone}
        />
      </div>

      {/* Completed Checkbox */}
      <div className="col-span-1 flex justify-center">
        <Checkbox
          checked={setData.completed}
          onCheckedChange={handleCompletedChange}
          disabled={isExerciseDone || !isComplete}
          className={cn(
            setData.completed && "bg-green-600 border-green-600"
          )}
        />
      </div>

      {/* Remove Button */}
      <div className="col-span-2 flex justify-end">
        {!isOnlySet && !isExerciseDone && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onRemove(exerciseIndex, setIndex)}
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
        {isComplete && setData.completed && (
          <Check className="h-4 w-4 text-green-600" />
        )}
      </div>
    </div>
  );
}
