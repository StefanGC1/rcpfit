import { create } from "zustand";
import { api } from "@/lib/api";
import type {
  WorkoutDraft,
  SessionData,
  SetData,
  CompletedSession,
} from "@/types";

// Debounce timer reference
let syncTimeout: ReturnType<typeof setTimeout> | null = null;
const SYNC_DEBOUNCE_MS = 2000;

// Debounced sync function - defined outside store to avoid circular reference
const debouncedSync = () => {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }
  syncTimeout = setTimeout(() => {
    useSessionStore.getState().syncToServer();
  }, SYNC_DEBOUNCE_MS);
};

interface SessionState {
  // State
  draft: WorkoutDraft | null;
  currentExerciseIndex: number;
  isLoading: boolean;
  isSyncing: boolean;
  hasUnsyncedChanges: boolean;
  error: string | null;

  // Actions
  startWorkout: (templateId?: number) => Promise<void>;
  loadDraft: () => Promise<boolean>;
  updateSet: (
    exerciseIndex: number,
    setIndex: number,
    data: Partial<SetData>
  ) => void;
  addSet: (exerciseIndex: number) => void;
  removeSet: (exerciseIndex: number, setIndex: number) => void;
  markExerciseDone: (exerciseIndex: number) => void;
  addAdHocExercise: (exerciseDefinitionId: number) => Promise<void>;
  goToExercise: (index: number) => void;
  goToNextExercise: () => void;
  goToPreviousExercise: () => void;
  finishWorkout: () => Promise<CompletedSession>;
  discardWorkout: () => Promise<void>;
  syncToServer: () => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

/**
 * Store for managing the active workout session.
 * Handles draft persistence, set logging, and workout finalization.
 */
export const useSessionStore = create<SessionState>()((set, get) => ({
  // Initial state
  draft: null,
  currentExerciseIndex: 0,
  isLoading: false,
  isSyncing: false,
  hasUnsyncedChanges: false,
  error: null,

  /**
   * Start a new workout session.
   * If templateId is provided, exercises are copied from the template.
   */
  startWorkout: async (templateId?: number) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post<WorkoutDraft>("/workouts/start", {
        template_id: templateId ?? null,
      });
      set({
        draft: response.data,
        currentExerciseIndex: 0,
        isLoading: false,
        hasUnsyncedChanges: false,
      });
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Failed to start workout";
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  /**
   * Load existing draft from server.
   * Returns true if a draft was found, false otherwise.
   */
  loadDraft: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<WorkoutDraft>("/workouts/draft");
      set({
        draft: response.data,
        currentExerciseIndex: 0,
        isLoading: false,
        hasUnsyncedChanges: false,
      });
      return true;
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      if (status === 404) {
        // No draft exists, that's fine
        set({ draft: null, isLoading: false });
        return false;
      }
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Failed to load workout";
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  /**
   * Update a specific set's data (reps, weight, completed).
   * Triggers a debounced sync to server.
   */
  updateSet: (
    exerciseIndex: number,
    setIndex: number,
    data: Partial<SetData>
  ) => {
    const { draft } = get();
    if (!draft) return;

    // Deep clone the session data
    const newSessionData: SessionData = JSON.parse(
      JSON.stringify(draft.session_data)
    );

    const exercise = newSessionData.exercises[exerciseIndex];
    if (!exercise) return;

    const setData = exercise.sets[setIndex];
    if (!setData) return;

    // Update the set
    Object.assign(setData, data);

    // Update draft in state
    set({
      draft: { ...draft, session_data: newSessionData },
      hasUnsyncedChanges: true,
    });

    // Trigger debounced sync
    debouncedSync();
  },

  /**
   * Add a new empty set to an exercise.
   */
  addSet: (exerciseIndex: number) => {
    const { draft } = get();
    if (!draft) return;

    const newSessionData: SessionData = JSON.parse(
      JSON.stringify(draft.session_data)
    );

    const exercise = newSessionData.exercises[exerciseIndex];
    if (!exercise) return;

    exercise.sets.push({
      reps: null,
      weight: null,
      completed: false,
    });

    set({
      draft: { ...draft, session_data: newSessionData },
      hasUnsyncedChanges: true,
    });

    debouncedSync();
  },

  /**
   * Remove a set from an exercise.
   */
  removeSet: (exerciseIndex: number, setIndex: number) => {
    const { draft } = get();
    if (!draft) return;

    const newSessionData: SessionData = JSON.parse(
      JSON.stringify(draft.session_data)
    );

    const exercise = newSessionData.exercises[exerciseIndex];
    if (!exercise || exercise.sets.length <= 1) return; // Keep at least one set

    exercise.sets.splice(setIndex, 1);

    set({
      draft: { ...draft, session_data: newSessionData },
      hasUnsyncedChanges: true,
    });

    debouncedSync();
  },

  /**
   * Mark an exercise as done.
   * Removes trailing empty sets (ghost sets).
   */
  markExerciseDone: (exerciseIndex: number) => {
    const { draft } = get();
    if (!draft) return;

    const newSessionData: SessionData = JSON.parse(
      JSON.stringify(draft.session_data)
    );

    const exercise = newSessionData.exercises[exerciseIndex];
    if (!exercise) return;

    // Remove trailing empty sets (ghost sets)
    while (exercise.sets.length > 1) {
      const lastSet = exercise.sets[exercise.sets.length - 1];
      if (lastSet.reps === null && lastSet.weight === null) {
        exercise.sets.pop();
      } else {
        break;
      }
    }

    // Mark as done
    exercise.is_done = true;

    set({
      draft: { ...draft, session_data: newSessionData },
      hasUnsyncedChanges: true,
    });

    // Sync immediately when marking done
    get().syncToServer();
  },

  /**
   * Add an ad-hoc exercise to the workout.
   */
  addAdHocExercise: async (exerciseDefinitionId: number) => {
    const { draft } = get();
    if (!draft) {
      throw new Error("No active workout");
    }

    // First sync any pending changes
    if (get().hasUnsyncedChanges) {
      await get().syncToServer();
    }

    set({ isLoading: true, error: null });
    try {
      const response = await api.post<WorkoutDraft>(
        "/workouts/draft/add-exercise",
        {
          exercise_definition_id: exerciseDefinitionId,
        }
      );
      set({
        draft: response.data,
        isLoading: false,
        hasUnsyncedChanges: false,
      });
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Failed to add exercise";
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  /**
   * Navigate to a specific exercise by index.
   */
  goToExercise: (index: number) => {
    const { draft } = get();
    if (!draft) return;

    const maxIndex = draft.session_data.exercises.length - 1;
    const clampedIndex = Math.max(0, Math.min(index, maxIndex));
    set({ currentExerciseIndex: clampedIndex });
  },

  /**
   * Navigate to the next exercise.
   */
  goToNextExercise: () => {
    const { currentExerciseIndex, draft } = get();
    if (!draft) return;

    const maxIndex = draft.session_data.exercises.length - 1;
    if (currentExerciseIndex < maxIndex) {
      set({ currentExerciseIndex: currentExerciseIndex + 1 });
    }
  },

  /**
   * Navigate to the previous exercise.
   */
  goToPreviousExercise: () => {
    const { currentExerciseIndex } = get();
    if (currentExerciseIndex > 0) {
      set({ currentExerciseIndex: currentExerciseIndex - 1 });
    }
  },

  /**
   * Finish the workout and save to completed sessions.
   */
  finishWorkout: async () => {
    const { draft } = get();
    if (!draft) {
      throw new Error("No active workout");
    }

    // First sync any pending changes
    if (get().hasUnsyncedChanges) {
      await get().syncToServer();
    }

    set({ isLoading: true, error: null });
    try {
      const response = await api.post<CompletedSession>("/workouts/finish");
      set({
        draft: null,
        currentExerciseIndex: 0,
        isLoading: false,
        hasUnsyncedChanges: false,
      });
      return response.data;
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Failed to finish workout";
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  /**
   * Discard the current workout without saving.
   */
  discardWorkout: async () => {
    set({ isLoading: true, error: null });
    try {
      await api.delete("/workouts/draft");
      set({
        draft: null,
        currentExerciseIndex: 0,
        isLoading: false,
        hasUnsyncedChanges: false,
      });
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      if (status === 404) {
        // Draft already gone, that's fine
        set({ draft: null, isLoading: false });
        return;
      }
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Failed to discard workout";
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  /**
   * Sync current draft state to server.
   */
  syncToServer: async () => {
    const { draft, hasUnsyncedChanges } = get();
    if (!draft || !hasUnsyncedChanges) return;

    // Clear any pending debounce timer
    if (syncTimeout) {
      clearTimeout(syncTimeout);
      syncTimeout = null;
    }

    set({ isSyncing: true });
    try {
      await api.put("/workouts/draft", {
        session_data: draft.session_data,
      });
      set({ isSyncing: false, hasUnsyncedChanges: false });
    } catch (error: unknown) {
      console.error("Failed to sync draft:", error);
      set({ isSyncing: false });
      // Don't throw - we'll retry on next change
    }
  },

  /**
   * Clear any error message.
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * Reset the store to initial state.
   */
  reset: () => {
    if (syncTimeout) {
      clearTimeout(syncTimeout);
      syncTimeout = null;
    }
    set({
      draft: null,
      currentExerciseIndex: 0,
      isLoading: false,
      isSyncing: false,
      hasUnsyncedChanges: false,
      error: null,
    });
  },
}));

// Helper function to calculate estimated session score from draft
export function calculateEstimatedScore(draft: WorkoutDraft | null): number {
  if (!draft) return 0;

  let totalScore = 0;
  for (const exercise of draft.session_data.exercises) {
    for (const set of exercise.sets) {
      if (set.reps && set.weight && set.reps > 0 && set.weight > 0) {
        // Epley formula: weight * (1 + reps/30)
        totalScore += set.weight * (1 + set.reps / 30);
      }
    }
  }
  return totalScore;
}

// Helper function to count valid sets
export function countValidSets(draft: WorkoutDraft | null): number {
  if (!draft) return 0;

  let count = 0;
  for (const exercise of draft.session_data.exercises) {
    for (const set of exercise.sets) {
      if (set.reps && set.weight && set.reps > 0 && set.weight > 0) {
        count++;
      }
    }
  }
  return count;
}

// Helper function to count completed exercises
export function countCompletedExercises(draft: WorkoutDraft | null): number {
  if (!draft) return 0;
  return draft.session_data.exercises.filter((e) => e.is_done).length;
}
