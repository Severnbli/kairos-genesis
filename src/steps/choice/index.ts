import { h, reveal, stepHeader } from '../../core/dom';
import { defineStep, type BaseStep } from '../../core/types';
import './style.css';

interface Option {
  value: string;
  label: string;
  emoji?: string;
  image?: string;
  hint?: string;
  /** Shown under the options after this one is picked. */
  response?: string;
}

interface ChoiceStep extends BaseStep {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  options: Option[];
  multiple?: boolean;
  min?: number;
  max?: number;
  layout?: 'cards' | 'list' | 'grid';
  allowOther?: boolean;
  otherLabel?: string;
  /** Single choice only: go to the next step shortly after picking. */
  autoAdvance?: boolean;
}

/**
 * Pick one or several options: where to go, what to eat, what to drink...
 * Stores the option `value` (string) or a list of values (string[]). With "other" enabled,
 * free text is stored as is.
 */
export default defineStep<ChoiceStep>({
  label: 'Choice',
  description: 'Pick one or several options (place, food, activity...).',
  collects: true,
  requiredByDefault: true,
  fields: [
    { key: 'eyebrow', label: 'Eyebrow', kind: 'text' },
    { key: 'title', label: 'Question', kind: 'text' },
    { key: 'subtitle', label: 'Subtitle', kind: 'textarea' },
    { key: 'layout', label: 'Layout', kind: 'select', options: [
      { value: 'cards', label: 'Cards (image/emoji, 2 columns)' },
      { value: 'grid', label: 'Grid (compact, 3 columns)' },
      { value: 'list', label: 'List' },
    ] },
    { key: 'multiple', label: 'Allow several answers', kind: 'boolean' },
    { key: 'min', label: 'Min selected (multiple)', kind: 'number', min: 0 },
    { key: 'max', label: 'Max selected (multiple)', kind: 'number', min: 1 },
    { key: 'autoAdvance', label: 'Go on automatically after picking (single)', kind: 'boolean' },
    { key: 'allowOther', label: 'Allow a custom answer', kind: 'boolean' },
    { key: 'otherLabel', label: 'Custom answer label', kind: 'text', placeholder: 'Something else…' },
    {
      key: 'options',
      label: 'Options',
      kind: 'list',
      itemLabel: 'Option',
      create: () => ({ value: `option-${Math.random().toString(36).slice(2, 6)}`, label: 'New option' }),
      item: [
        { key: 'label', label: 'Label', kind: 'text' },
        { key: 'value', label: 'Value (stored, used in conditions)', kind: 'text' },
        { key: 'emoji', label: 'Emoji', kind: 'text' },
        { key: 'image', label: 'Image', kind: 'image' },
        { key: 'hint', label: 'Hint', kind: 'text' },
        { key: 'response', label: 'Reaction after picking', kind: 'text' },
      ],
    },
  ],
  create: () => ({
    title: 'Where should we go?',
    layout: 'cards',
    options: [
      { value: 'a', label: 'Option A', emoji: '🌙' },
      { value: 'b', label: 'Option B', emoji: '☕' },
    ],
  }),
  summarize(cfg, value) {
    const list = Array.isArray(value) ? value : [String(value)];
    return list.map((v) => cfg.options.find((o) => o.value === v)?.label ?? v).join(', ');
  },
  mount(el, cfg, ctx) {
    const id = cfg.id ?? 'choice';
    const values = new Set(cfg.options.map((o) => o.value));
    const read = (): string[] => {
      const v = ctx.answers.get<string | string[]>(id);
      return v === undefined ? [] : Array.isArray(v) ? v : [v];
    };
    let selected = read();
    let other = selected.find((v) => !values.has(v)) ?? '';

    el.append(stepHeader(ctx.fill, cfg));
    const list = h('div', { class: `choice choice--${cfg.layout ?? 'cards'}`, role: cfg.multiple ? 'group' : 'radiogroup' });
    const response = h('p', { class: 'choice__response', 'aria-live': 'polite' });
    const buttons = cfg.options.map((opt) => {
      const btn = h('button', { class: 'choice__option', type: 'button', role: cfg.multiple ? 'checkbox' : 'radio', onclick: () => toggle(opt.value) },
        opt.image ? h('img', { class: 'choice__image', src: opt.image, alt: '', loading: 'lazy' }) : opt.emoji ? h('span', { class: 'choice__emoji' }, opt.emoji) : null,
        h('span', { class: 'choice__label' }, ctx.fill(opt.label)),
        opt.hint ? h('span', { class: 'choice__hint' }, ctx.fill(opt.hint)) : null,
      );
      btn.dataset.value = opt.value;
      return btn;
    });
    list.append(...reveal(buttons, 2));

    let otherInput: HTMLInputElement | null = null;
    if (cfg.allowOther) {
      otherInput = h('input', { class: 'field choice__other', type: 'text', placeholder: ctx.fill(cfg.otherLabel || 'Something else…'), value: other, maxlength: 120 });
      otherInput.addEventListener('input', () => {
        other = otherInput!.value.trim();
        if (!cfg.multiple) selected = other ? [other] : [];
        else selected = [...selected.filter((v) => values.has(v)), ...(other ? [other] : [])];
        commit();
      });
      el.append(list, ...reveal([otherInput], buttons.length + 2), response);
    } else {
      el.append(list, response);
    }

    let advanceTimer = 0;
    function toggle(value: string): void {
      if (cfg.multiple) {
        if (selected.includes(value)) selected = selected.filter((v) => v !== value);
        else if (!cfg.max || selected.filter((v) => values.has(v)).length < cfg.max) selected = [...selected, value];
      } else {
        selected = [value];
        if (otherInput) otherInput.value = other = '';
      }
      commit();
      if (!cfg.multiple && cfg.autoAdvance) {
        clearTimeout(advanceTimer);
        advanceTimer = window.setTimeout(() => ctx.next(), 700);
      }
    }

    function commit(): void {
      const value = cfg.multiple ? selected : selected[0];
      ctx.answers.set(id, value === undefined || (Array.isArray(value) && !value.length) ? undefined : value);
      paint();
    }

    function paint(): void {
      for (const btn of buttons) {
        const on = selected.includes(btn.dataset.value!);
        btn.classList.toggle('is-selected', on);
        btn.setAttribute('aria-checked', String(on));
      }
      const last = [...selected].reverse().find((v) => values.has(v));
      const text = cfg.options.find((o) => o.value === last)?.response;
      response.textContent = text ? ctx.fill(text) : '';
      const min = cfg.multiple ? Math.max(cfg.min ?? 1, 1) : 1;
      ctx.setComplete(selected.length >= min);
    }

    paint();
    return { leave: () => clearTimeout(advanceTimer) };
  },
});
