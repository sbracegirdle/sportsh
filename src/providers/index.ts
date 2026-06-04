import type { SportsProvider } from "../domain/events.ts";
import { createAflProvider } from "./afl/footyWire.ts";
import { createEspnCricinfoProvider } from "./cricket/espnCricinfo.ts";
import { createCourseDuJourProvider } from "./cycling/courseDuJour.ts";
import { createWorldMarathonMajorsProvider } from "./marathon/worldMarathonMajors.ts";
import { createF1Provider } from "./motorsport/f1.ts";
import { createWrcProvider } from "./motorsport/wrc.ts";
import { createWorldTriathlonProvider } from "./triathlon/worldTriathlon.ts";

export function createDefaultProviders(): SportsProvider[] {
  return [
    createEspnCricinfoProvider(),
    createCourseDuJourProvider(),
    createF1Provider(),
    createWrcProvider(),
    createWorldTriathlonProvider(),
    createWorldMarathonMajorsProvider(),
    createAflProvider(),
  ];
}
