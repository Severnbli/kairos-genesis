import { stepTypes } from '../steps';
import type { StoryConfig } from '../core/types';

export interface Issue {
  /** Step index, or -1 for story-wide problems. */
  step: number;
  message: string;
}

/** Problems worth fixing before sending the link. Shown as badges in the admin sidebar. */
export function validate(story: StoryConfig): Issue[] {
  const issues: Issue[] = [];
  const seen = new Map<string, number>();
  const ids = new Set(story.steps.map((s) => s.id).filter(Boolean));

  story.steps.forEach((step, i) => {
    const module = stepTypes[step.type];
    if (!module) {
      issues.push({ step: i, message: `Unknown type "${step.type}"` });
      return;
    }
    if (module.collects && !step.id) issues.push({ step: i, message: 'Needs an answer ID, otherwise the answer is not saved' });
    if (step.id) {
      if (!/^\w+$/.test(step.id)) issues.push({ step: i, message: 'Answer ID: use only letters, digits and _' });
      if (seen.has(step.id)) issues.push({ step: i, message: `Answer ID "${step.id}" is also used by step ${seen.get(step.id)! + 1}` });
      else seen.set(step.id, i);
    }
    for (const c of step.when ?? []) {
      if (!ids.has(c.id)) issues.push({ step: i, message: `Condition uses unknown answer "${c.id}"` });
      const source = story.steps.findIndex((s) => s.id === c.id);
      if (source > i) issues.push({ step: i, message: `Condition depends on "${c.id}", which comes later` });
    }
    const options = step.options as { value?: string }[] | undefined;
    if (Array.isArray(options)) {
      const values = options.map((o) => o.value);
      if (new Set(values).size !== values.length) issues.push({ step: i, message: 'Two options share the same value' });
      if (values.some((v) => !v)) issues.push({ step: i, message: 'An option has no value' });
    }
  });

  if (!story.steps.length) issues.push({ step: -1, message: 'The story has no steps' });
  if (!story.meta?.storageKey) issues.push({ step: -1, message: 'Storage key is empty' });
  return issues;
}
