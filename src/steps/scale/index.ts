import { h, reveal, stepHeader } from '../../core/dom';
import { defineStep, type BaseStep } from '../../core/types';
import './style.css';

interface ScaleStep extends BaseStep {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  min: number;
  max: number;
  step?: number;
  /** Optional word per value, from min to max ("not at all", "a bit", ...). */
  marks?: string[];
  minLabel?: string;
  maxLabel?: string;
  /** Starting position; counts as answered once the slider moves (or on leaving, when not required). */
  initial?: number;
}

/** A slider: how hungry, how adventurous, how far to walk... Stores a number. */
export default defineStep<ScaleStep>({
  label: 'Scale',
  description: 'A slider with optional words per value (how hungry, how adventurous...).',
  collects: true,
  requiredByDefault: false,
  fields: [
    { key: 'eyebrow', label: 'Eyebrow', kind: 'text' },
    { key: 'title', label: 'Question', kind: 'text' },
    { key: 'subtitle', label: 'Subtitle', kind: 'textarea' },
    { key: 'min', label: 'Min', kind: 'number' },
    { key: 'max', label: 'Max', kind: 'number' },
    { key: 'step', label: 'Step', kind: 'number', min: 0.1 },
    { key: 'initial', label: 'Initial value', kind: 'number' },
    { key: 'minLabel', label: 'Left label', kind: 'text' },
    { key: 'maxLabel', label: 'Right label', kind: 'text' },
    { key: 'marks', label: 'Word per value', kind: 'lines', help: 'One line per value from min to max. Overrides the number.' },
  ],
  create: () => ({ title: 'How hungry are you?', min: 0, max: 4, marks: ['Not at all', 'A little', 'Hungry', 'Very', 'Feed me now'] }),
  summarize(cfg, value) {
    const n = Number(value);
    const step = cfg.step ?? 1;
    const mark = cfg.marks?.[Math.round((n - cfg.min) / step)];
    return mark ?? `${n} / ${cfg.max}`;
  },
  mount(el, cfg, ctx) {
    const id = cfg.id ?? 'scale';
    const stored = ctx.answers.get<number>(id);
    const start = stored ?? cfg.initial ?? Math.round((cfg.min + cfg.max) / 2);
    const output = h('output', { class: 'scale__value' });
    const input = h('input', { class: 'scale__input', type: 'range', min: cfg.min, max: cfg.max, step: cfg.step ?? 1, value: start, 'aria-label': ctx.fill(cfg.title) });
    const ends = h('div', { class: 'scale__ends' }, h('span', null, ctx.fill(cfg.minLabel ?? String(cfg.min))), h('span', null, ctx.fill(cfg.maxLabel ?? String(cfg.max))));

    const paint = () => {
      const n = Number(input.value);
      const mark = cfg.marks?.[Math.round((n - cfg.min) / (cfg.step ?? 1))];
      output.textContent = mark ? ctx.fill(mark) : String(n);
      input.style.setProperty('--fill', `${((n - cfg.min) / (cfg.max - cfg.min || 1)) * 100}%`);
    };
    input.addEventListener('input', () => {
      ctx.answers.set(id, Number(input.value));
      paint();
      ctx.setComplete(true);
    });

    el.append(stepHeader(ctx.fill, cfg), ...reveal([h('div', { class: 'scale' }, output, input, ends)], 3));
    paint();
    ctx.setComplete(stored !== undefined);
    // Not required: record the initial value so the recap has something to show.
    return {
      leave() {
        if (ctx.answers.get(id) === undefined && !(cfg.required ?? false)) ctx.answers.set(id, Number(input.value));
      },
    };
  },
});
