import { h, reveal, stepHeader } from '../../core/dom';
import { defineStep, type BaseStep } from '../../core/types';
import './style.css';

interface TextStep extends BaseStep {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  inputType?: 'text' | 'email' | 'tel' | 'url';
}

/** Free text: "anything I should know?", allergies, a song request... Stores a string. */
export default defineStep<TextStep>({
  label: 'Text',
  description: 'Free text answer (short or multi-line).',
  collects: true,
  requiredByDefault: false,
  fields: [
    { key: 'eyebrow', label: 'Eyebrow', kind: 'text' },
    { key: 'title', label: 'Question', kind: 'text' },
    { key: 'subtitle', label: 'Subtitle', kind: 'textarea' },
    { key: 'placeholder', label: 'Placeholder', kind: 'text' },
    { key: 'multiline', label: 'Multi-line', kind: 'boolean' },
    { key: 'maxLength', label: 'Max length', kind: 'number', min: 1 },
    { key: 'inputType', label: 'Input type (single line)', kind: 'select', options: [
      { value: 'text', label: 'Text' }, { value: 'email', label: 'Email' }, { value: 'tel', label: 'Phone' }, { value: 'url', label: 'URL' },
    ] },
  ],
  create: () => ({ title: 'Anything I should know?', placeholder: 'Allergies, wishes, a song…', multiline: true, maxLength: 500 }),
  mount(el, cfg, ctx) {
    const id = cfg.id ?? 'text';
    const value = ctx.answers.get<string>(id) ?? '';
    const attrs = { class: 'field text__field', placeholder: cfg.placeholder ? ctx.fill(cfg.placeholder) : '', maxlength: cfg.maxLength ?? 500, 'aria-label': ctx.fill(cfg.title) };
    const field = cfg.multiline ? h('textarea', { ...attrs, rows: 5 }) : h('input', { ...attrs, type: cfg.inputType ?? 'text' });
    field.value = value;
    const counter = h('span', { class: 'text__counter' });
    const paint = () => {
      counter.textContent = `${field.value.length} / ${cfg.maxLength ?? 500}`;
      ctx.setComplete(field.value.trim().length > 0 && field.checkValidity());
    };
    field.addEventListener('input', () => {
      const v = field.value.trim();
      ctx.answers.set(id, v || undefined);
      paint();
    });
    el.append(stepHeader(ctx.fill, cfg), ...reveal([h('div', { class: 'text' }, field, counter)], 3));
    paint();
  },
});
