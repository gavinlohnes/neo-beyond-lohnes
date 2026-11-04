import type { UrgeTrigger } from "../common/types";

export type LogTemplateCard =
  | { kind: "log_meal"; saved_meal_id?: string | undefined; name: string; calories: number; protein_g: number; carbs_g?: number | undefined; fat_g?: number | undefined; servings?: number | undefined; remember?: boolean | undefined }
  | { kind: "log_water"; oz: number }
  | { kind: "log_sleep"; minutes: number; nap?: boolean }
  | { kind: "log_weight"; lbs: number }
  | { kind: "log_urge"; trigger: UrgeTrigger }
  | { kind: "clean_day" };

export interface TextSnippet { id: string; trigger: string; text: string; createdAt: string; updatedAt: string }
export interface LogTemplate { id: string; name: string; cards: LogTemplateCard[]; createdAt: string; updatedAt: string }
