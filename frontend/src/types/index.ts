// User types
export interface User {
  id: number;
  email: string;
  created_at: string;
}

// Auth types
export interface Token {
  access_token: string;
  token_type: string;
}

// Exercise types
export interface Exercise {
  id: number;
  name: string;
  created_at: string;
}

export interface ExerciseCreate {
  name: string;
}

// Split types
export interface Split {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  templates?: Template[];
}

export interface SplitCreate {
  name: string;
}

export interface SplitUpdate {
  name?: string;
  is_active?: boolean;
}

// Template types
export interface Template {
  id: number;
  split_id: number;
  name: string;
  order: number;
  created_at: string;
  exercises?: Exercise[];
}

export interface TemplateCreate {
  split_id: number;
  name: string;
  order: number;
}

export interface TemplateUpdate {
  name?: string;
  order?: number;
}

// Workout session types (for future phases)
export interface SetData {
  reps: number | null;
  weight: number | null;
  completed: boolean;
}

export interface ExerciseData {
  definition_id: number;
  name: string;
  sets: SetData[];
  is_done: boolean;
}

export interface SessionData {
  exercises: ExerciseData[];
}

export interface WorkoutDraft {
  id: number;
  template_id: number | null;
  session_data: SessionData;
  started_at: string;
  updated_at: string;
}

export interface CompletedSession {
  id: number;
  template_id: number | null;
  started_at: string;
  completed_at: string;
  session_score: number;
}
