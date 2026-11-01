import { h, reveal, stepHeader } from '../../core/dom';
import { defineStep, type BaseStep } from '../../core/types';
import './style.css';

interface ConfirmStep extends BaseStep {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  yes: string;
  no: string;
  yesResponse?: string;
  noResponse?: string;
  /** The "no" button playfully runs away a few times before it can be clicked. */
  dodge?: boolean;
  /** Hide the "no" button entirely. */
  hideNo?: boolean;
  /** Go to the next step after "yes". */
  advanceOnYes?: boolean;
}

/** A yes / no question ("Is it a date?"). Stores a boolean. */
export default defineStep<ConfirmStep>({
  label: 'Yes / No',
  description: 'A yes or no question. The "no" can playfully run away.',
  collects: true,
  requiredByDefault: true,
  fields: [
    { key: 'eyebrow', label: 'Eyebrow', kind: 'text' },
    { key: 'title', label: 'Question', kind: 'text' },
    { key: 'subtitle', label: 'Subtitle', kind: 'textarea' },
    { key: 'yes', label: 'Yes label', kind: 'text' },
    { key: 'no', label: 'No label', kind: 'text' },
    { key: 'yesResponse', label: 'Reaction to yes', kind: 'text' },
    { key: 'noResponse', label: 'Reaction to no', kind: 'text' },
    { key: 'dodge', label: '"No" runs away', kind: 'boolean' },
    { key: 'hideNo', label: 'Hide "no"', kind: 'boolean' },
    { key: 'advanceOnYes', label: 'Go on automatically after yes', kind: 'boolean' },
  ],
  create: () => ({ title: 'So… is it a date?', yes: 'Yes', no: 'No', yesResponse: 'Then it is a beginning.', dodge: true }),
  summarize(cfg, value) {
    return value === true ? cfg.yes : cfg.no;
  },
  mount(el, cfg, ctx) {
    const id = cfg.id ?? 'confirm';
    const response = h('p', { class: 'confirm__response', 'aria-live': 'polite' });
    const yes = h('button', { class: 'btn btn--primary', type: 'button', onclick: () => choose(true) }, ctx.fill(cfg.yes));
    const no = h('button', { class: 'btn btn--ghost confirm__no', type: 'button', onclick: () => choose(false) }, ctx.fill(cfg.no));
    const row = h('div', { class: 'confirm__row' }, yes, cfg.hideNo ? null : no);
    el.append(stepHeader(ctx.fill, cfg), ...reveal([row], 3), response);

    let dodges = 0;
    if (cfg.dodge && !ctx.reducedMotion) {
      const run = (e: Event) => {
        if (dodges >= 5) return;
        e.preventDefault();
        dodges += 1;
        const x = (Math.random() - 0.5) * 220;
        const y = (Math.random() - 0.5) * 140;
        no.style.transform = `translate(${x}px, ${y}px)`;
      };
      no.addEventListener('pointerenter', run);
      no.addEventListener('touchstart', run, { passive: false });
    }

    let timer = 0;
    function choose(value: boolean): void {
      ctx.answers.set(id, value);
      paint();
      if (value && cfg.advanceOnYes) timer = window.setTimeout(() => ctx.next(), 900);
    }

    function paint(): void {
      const value = ctx.answers.get<boolean>(id);
      yes.classList.toggle('is-selected', value === true);
      no.classList.toggle('is-selected', value === false);
      const text = value === true ? cfg.yesResponse : value === false ? cfg.noResponse : '';
      response.textContent = text ? ctx.fill(text) : '';
      ctx.setComplete(value !== undefined);
    }

    paint();
    return { leave: () => clearTimeout(timer) };
  },
});
