import type { SportsProvider } from "../domain/events.ts";
import { createEspnCricinfoProvider } from "./cricket/espnCricinfo.ts";
import { createCourseDuJourProvider } from "./cycling/courseDuJour.ts";

export function createDefaultProviders(): SportsProvider[] {
  return [
    createEspnCricinfoProvider(),
    createCourseDuJourProvider(),
  ];
}
