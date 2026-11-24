/**
 * GRAYSON-TRAIN-REST-001: the application-layer seam for the rest-end buzz preference, as checkInReminderQueries.ts
 * is for the check-in reminder. TRAIN and MORE read and write it here, never persistence directly.
 */
export {
  getRestBuzzPreference,
  setRestBuzzPreference,
  type RestBuzzPreference,
  type RestBuzzStrength,
} from "../persistence/restBuzzPreference";
