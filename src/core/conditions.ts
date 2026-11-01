import type { Answers, Condition } from './types';

export function matches(conditions: Condition[] | undefined, answers: Answers): boolean {
  if (!conditions?.length) return true;
  return conditions.every((c) => check(c, answers));
}

function check({ id, op, value }: Condition, answers: Answers): boolean {
  const answer = answers[id];
  const list = Array.isArray(answer) ? answer : answer === undefined ? [] : [answer];
  switch (op) {
    case 'answered':
      return list.length > 0 && answer !== '';
    case 'equals':
      return list.some((a) => String(a) === String(value));
    case 'notEquals':
      return !list.some((a) => String(a) === String(value));
    case 'includes':
      return list.some((a) => String(a).toLowerCase().includes(String(value).toLowerCase()));
    case 'excludes':
      return !list.some((a) => String(a).toLowerCase().includes(String(value).toLowerCase()));
    case 'gte':
      return typeof answer === 'number' && answer >= Number(value);
    case 'lte':
      return typeof answer === 'number' && answer <= Number(value);
    default:
      return true;
  }
}

export const conditionOps: { value: Condition['op']; label: string }[] = [
  { value: 'equals', label: 'equals' },
  { value: 'notEquals', label: 'does not equal' },
  { value: 'includes', label: 'contains' },
  { value: 'excludes', label: 'does not contain' },
  { value: 'answered', label: 'is answered' },
  { value: 'gte', label: '≥' },
  { value: 'lte', label: '≤' },
];
