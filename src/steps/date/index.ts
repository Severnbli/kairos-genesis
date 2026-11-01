import { h, reveal, stepHeader } from '../../core/dom';
import { defineStep, type BaseStep } from '../../core/types';
import './style.css';

interface DateStep extends BaseStep {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Offered days as YYYY-MM-DD. Empty: a free date picker limited by `minDate` / `maxDate`. */
  dates?: string[];
  minDate?: string;
  maxDate?: string;
  /** Offered times as HH:MM. Empty: no time is asked. */
  times?: string[];
  /** Also allow typing any time. */
  customTime?: boolean;
}

/**
 * When: pick a day (from offered ones or a free picker) and optionally a time.
 * Stores "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM".
 */
export default defineStep<DateStep>({
  label: 'Date & time',
  description: 'Pick a day from offered dates (or any date) and a time.',
  collects: true,
  requiredByDefault: true,
  fields: [
    { key: 'eyebrow', label: 'Eyebrow', kind: 'text' },
    { key: 'title', label: 'Question', kind: 'text' },
    { key: 'subtitle', label: 'Subtitle', kind: 'textarea' },
    { key: 'dates', label: 'Offered days', kind: 'lines', help: 'One YYYY-MM-DD per line. Leave empty for a free date picker.' },
    { key: 'minDate', label: 'Earliest date (free picker)', kind: 'text', placeholder: 'YYYY-MM-DD' },
    { key: 'maxDate', label: 'Latest date (free picker)', kind: 'text', placeholder: 'YYYY-MM-DD' },
    { key: 'times', label: 'Offered times', kind: 'lines', help: 'One HH:MM per line. Leave empty to skip time.' },
    { key: 'customTime', label: 'Allow any time', kind: 'boolean' },
  ],
  create: () => ({ title: 'When are you free?', dates: [], times: ['18:00', '19:00', '20:00'] }),
  summarize(_cfg, value) {
    return formatWhen(String(value));
  },
  mount(el, cfg, ctx) {
    const id = cfg.id ?? 'when';
    const lang = ctx.story.meta.lang;
    const [storedDay = '', storedTime = ''] = String(ctx.answers.get<string>(id) ?? '').split('T');
    let day = storedDay;
    let time = storedTime;
    const needsTime = Boolean(cfg.times?.length || cfg.customTime);

    el.append(stepHeader(ctx.fill, cfg));
    const blocks: HTMLElement[] = [];

    // Day
    let dayChips: HTMLButtonElement[] = [];
    if (cfg.dates?.length) {
      dayChips = cfg.dates.map((d) => {
        const date = parseDay(d);
        const btn = h('button', { class: 'chip date__day', type: 'button', onclick: () => { day = d; commit(); } },
          h('span', { class: 'date__weekday' }, date.toLocaleDateString(lang, { weekday: 'short' })),
          h('span', { class: 'date__num' }, String(date.getDate())),
          h('span', { class: 'date__month' }, date.toLocaleDateString(lang, { month: 'short' })),
        );
        btn.dataset.value = d;
        return btn;
      });
      blocks.push(h('div', { class: 'date__days' }, ...dayChips));
    } else {
      const picker = h('input', { class: 'field', type: 'date', value: day, min: cfg.minDate, max: cfg.maxDate, 'aria-label': ctx.fill(cfg.title) });
      picker.addEventListener('change', () => { day = picker.value; commit(); });
      blocks.push(picker);
    }

    // Time
    let timeChips: HTMLButtonElement[] = [];
    let timeInput: HTMLInputElement | null = null;
    if (needsTime) {
      timeChips = (cfg.times ?? []).map((t) => {
        const btn = h('button', { class: 'chip', type: 'button', onclick: () => { time = t; if (timeInput) timeInput.value = ''; commit(); } }, t);
        btn.dataset.value = t;
        return btn;
      });
      const row = h('div', { class: 'date__times' }, ...timeChips);
      if (cfg.customTime) {
        timeInput = h('input', { class: 'field date__time-input', type: 'time', 'aria-label': 'Time' });
        if (time && !cfg.times?.includes(time)) timeInput.value = time;
        timeInput.addEventListener('change', () => { time = timeInput!.value; commit(); });
        row.append(timeInput);
      }
      blocks.push(row);
    }

    el.append(...reveal(blocks, 3));

    function commit(): void {
      ctx.answers.set(id, day ? (needsTime && time ? `${day}T${time}` : day) : undefined);
      paint();
    }

    function paint(): void {
      dayChips.forEach((b) => b.classList.toggle('is-selected', b.dataset.value === day));
      timeChips.forEach((b) => b.classList.toggle('is-selected', b.dataset.value === time));
      ctx.setComplete(Boolean(day) && (!needsTime || Boolean(time)));
    }

    paint();
  },
});

function parseDay(d: string): Date {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, (m || 1) - 1, day || 1);
}

function formatWhen(value: string, lang?: string): string {
  const [day, time] = value.split('T');
  const date = parseDay(day);
  if (Number.isNaN(date.getTime())) return value;
  const text = date.toLocaleDateString(lang ?? document.documentElement.lang, { weekday: 'long', day: 'numeric', month: 'long' });
  return time ? `${text}, ${time}` : text;
}
