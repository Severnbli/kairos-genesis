import type { StepModule } from '../core/types';
import choice from './choice';
import confirm from './confirm';
import date from './date';
import intro from './intro';
import message from './message';
import scale from './scale';
import summary from './summary';
import text from './text';

/**
 * Registry of step types. The key is the `type` used in story.json.
 * To add a type: create src/steps/<name>/index.ts (+ style.css) and register it here.
 * The admin picks it up automatically from `label`, `description`, `fields` and `create`.
 */
export const stepTypes: Record<string, StepModule<any>> = {
  intro,
  message,
  choice,
  scale,
  text,
  date,
  confirm,
  summary,
};
