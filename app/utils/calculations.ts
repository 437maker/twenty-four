// calculations.ts — Business logic: computing scores and streaks.
//
// Keeping math separate from the UI means you can test and change it
// without touching any screen code.

import { Task } from '../types';

// Plan Adherence = (hours of completed tasks / total planned hours) × 100
// Returns an integer 0–100.
// Example: planned 8 hours, completed 6 hours → 75
export function calculatePlanAdherence(tasks: Task[]): number {
  if (tasks.length === 0) return 0;

  const totalPlanned = tasks.reduce((sum, t) => sum + t.duration_hours, 0);
  if (totalPlanned === 0) return 0;

  const completedHours = tasks
    .filter((t) => t.completed)
    .reduce((sum, t) => sum + t.duration_hours, 0);

  // Math.round rounds 75.4 → 75, Math.min caps at 100
  return Math.min(100, Math.round((completedHours / totalPlanned) * 100));
}

// Calculate how many hours have been logged (completed) per pillar today.
export function getHoursPerPillar(tasks: Task[]): {
  work: number;
  personal: number;
  sleep: number;
} {
  // Only count completed tasks — incomplete tasks are still "planned", not logged
  const done = tasks.filter((t) => t.completed);

  return {
    work:     done.filter((t) => t.pillar === 'work').reduce((s, t) => s + t.duration_hours, 0),
    personal: done.filter((t) => t.pillar === 'personal').reduce((s, t) => s + t.duration_hours, 0),
    sleep:    done.filter((t) => t.pillar === 'sleep').reduce((s, t) => s + t.duration_hours, 0),
  };
}

// Determines the new streak value after the user updates today's tasks.
// Rules:
//   - If any task is completed → streak + 1
//   - If tasks exist but none are completed → streak resets to 0
//   - If no tasks at all → streak unchanged
export function calculateNewStreak(tasks: Task[], currentStreak: number): number {
  const anyCompleted = tasks.some((t) => t.completed);
  const anyTasks = tasks.length > 0;

  if (anyCompleted) return currentStreak + 1;
  if (anyTasks) return 0;
  return currentStreak;
}
