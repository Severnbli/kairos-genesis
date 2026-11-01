import type { AnswerValue, Answers } from './types';

/** Answers kept in memory and mirrored to localStorage (when available). */
export function createAnswerStore(key: string, onChange: () => void) {
  const storageKey = `${key}:answers`;
  let answers: Answers = load();

  function load(): Answers {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as Answers) : {};
    } catch {
      return {};
    }
  }

  function save(): void {
    try {
      localStorage.setItem(storageKey, JSON.stringify(answers));
    } catch {
      /* private mode or blocked storage: answers stay in memory */
    }
  }

  return {
    get<T extends AnswerValue>(id: string): T | undefined {
      return answers[id] as T | undefined;
    },
    set(id: string, value: AnswerValue | undefined): void {
      if (value === undefined) delete answers[id];
      else answers[id] = value;
      save();
      onChange();
    },
    all(): Answers {
      return { ...answers };
    },
    clear(): void {
      answers = {};
      save();
      onChange();
    },
  };
}
