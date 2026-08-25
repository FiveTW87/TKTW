import type { StartTutorialInput } from "@tktw/shared";
import { ADVANCED_TUTORIAL_LESSONS } from "./advancedLessons";
import { BASIC_TUTORIAL_LESSONS, type TutorialLesson } from "./basicLessons";

export const ALL_TUTORIAL_LESSONS = [
  ...BASIC_TUTORIAL_LESSONS,
  ...ADVANCED_TUTORIAL_LESSONS,
] as const satisfies readonly TutorialLesson[];

type CatalogId = (typeof ALL_TUTORIAL_LESSONS)[number]["id"];
type MissingCatalogId = Exclude<StartTutorialInput["scenarioId"], CatalogId>;
type UnexpectedCatalogId = Exclude<CatalogId, StartTutorialInput["scenarioId"]>;
const catalogIsExhaustive: MissingCatalogId extends never
  ? UnexpectedCatalogId extends never ? true : never
  : never = true;
void catalogIsExhaustive;

export function tutorialLesson(id: StartTutorialInput["scenarioId"]): TutorialLesson {
  const lesson = ALL_TUTORIAL_LESSONS.find((candidate) => candidate.id === id);
  if (!lesson) throw new Error(`Unknown tutorial lesson '${id}'.`);
  return lesson;
}

export function nextTutorialLesson(id: StartTutorialInput["scenarioId"]): TutorialLesson | undefined {
  const index = ALL_TUTORIAL_LESSONS.findIndex((candidate) => candidate.id === id);
  return ALL_TUTORIAL_LESSONS[index + 1];
}
