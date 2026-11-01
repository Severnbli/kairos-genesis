import type { Field } from './schema';

/** A single stored answer. Each step type decides which shape it writes. */
export type AnswerValue = string | string[] | number | boolean;
export type Answers = Record<string, AnswerValue>;

/**
 * Serializable visibility rule. A step with `when` is shown only if every condition holds.
 *   { "id": "place", "op": "equals", "value": "dinner" }
 */
export interface Condition {
  id: string;
  op: 'equals' | 'notEquals' | 'includes' | 'excludes' | 'answered' | 'gte' | 'lte';
  value?: string | number | boolean;
}

/** Per-step look overrides, editable in the admin. */
export interface StepAppearance {
  align?: 'center' | 'start';
  /** Image URL (e.g. `media/table.jpg` from /public) shown behind the step. */
  background?: string;
  /** 0..1 darkness of the overlay on top of the background image. */
  overlay?: number;
  /** Accent color for this step only. */
  accent?: string;
  /** Extra CSS class(es) for custom styling in src/styles/custom.css. */
  className?: string;
}

/** Fields every step has, regardless of its type. */
export interface BaseStep {
  /** Step type, a key of `stepTypes` in src/steps/index.ts. */
  type: string;
  /**
   * Answer key. Needed for steps that collect input: it is where the answer is stored and how
   * other steps reference it (`{place}` in text, `when` conditions).
   */
  id?: string;
  /** Show only when all conditions hold. */
  when?: Condition[];
  /** Lock "next" until the step has a valid answer. Defaults per step type. */
  required?: boolean;
  /** Short label in the final recap. Falls back to `title`. */
  recapLabel?: string;
  /** Admin-only note, never shown on the site. */
  note?: string;
  appearance?: StepAppearance;
  [key: string]: unknown;
}

export interface RecapItem {
  id: string;
  title: string;
  value: string;
}

export interface StepContext {
  /** Go to the next visible step (respects gating). */
  next(): void;
  back(): void;
  /** Read and write answers. Writing re-evaluates `when` conditions and persists to storage. */
  answers: {
    get<T extends AnswerValue>(id: string): T | undefined;
    set(id: string, value: AnswerValue | undefined): void;
    all(): Answers;
    clear(): void;
  };
  /** Tell the engine whether this step currently has a valid answer (unlocks "next"). */
  setComplete(done: boolean): void;
  /** Replace `{key}` placeholders with story vars or human-readable answers. */
  fill(text: string): string;
  /** Readable list of every answered, visible step (used by the summary step). */
  recap(): RecapItem[];
  story: StoryConfig;
  reducedMotion: boolean;
}

export interface StepInstance {
  /** Called every time the step becomes active. Good place to re-render dynamic text. */
  enter?(): void;
  leave?(): void;
}

export interface StepModule<C extends BaseStep = BaseStep> {
  /** Name shown in the admin "add step" menu. */
  label: string;
  /** One line for the admin explaining what the step does. */
  description: string;
  /** Editable fields; the admin renders its form from this. */
  fields: Field[];
  /** A fresh config used when the step is added in the admin. */
  create(): Omit<C, 'type'>;
  /** Build the step's DOM inside `el`. Called once, when the story boots. */
  mount(el: HTMLElement, config: C, ctx: StepContext): StepInstance | void;
  /** Turn a stored answer into readable text for the recap and `{id}` placeholders. */
  summarize?(config: C, value: AnswerValue): string | null;
  /** True if the step stores an answer (the admin then asks for an `id`). */
  collects?: boolean;
  /** Default for `required` when the config does not set it. */
  requiredByDefault?: boolean;
  /** Hide the bottom navigation while active (the step drives navigation itself). */
  hideNav?: boolean;
}

/** Keeps the config type attached to the module for inference inside the step. */
export function defineStep<C extends BaseStep>(module: StepModule<C>): StepModule<C> {
  return module;
}

export interface ThemeTokens {
  bg: string;
  bgElevated: string;
  text: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  border: string;
  fontDisplay: string;
  fontBody: string;
  radius: string;
}

export interface SubmitConfig {
  /** POST answers as JSON here (Formspree, a Cloudflare Worker, a Google Apps Script, ...). */
  endpoint?: string;
  /** Telegram username (without @): copies the recap and opens your chat so the recipient can paste it. */
  telegram?: string;
  /** WhatsApp number in international format, digits only. */
  whatsapp?: string;
  /** Email address for a mailto: link. */
  email?: string;
  /** Show a "copy / share" button. */
  share?: boolean;
}

export interface StoryConfig {
  meta: {
    title: string;
    description?: string;
    lang?: string;
    /** localStorage namespace. Change it to reset everyone's saved answers. */
    storageKey: string;
    /** Google Fonts URL loaded at boot (must match theme fonts). */
    fontsUrl?: string;
  };
  /** Free placeholders, usable as `{name}` in any text. */
  vars: Record<string, string>;
  theme: Partial<ThemeTokens>;
  ambient: { particles: boolean; density: number };
  submit: SubmitConfig;
  labels: { next: string; back: string };
  steps: BaseStep[];
}
