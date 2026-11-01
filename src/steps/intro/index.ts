import { compact, h, reveal } from '../../core/dom';
import { defineStep, type BaseStep } from '../../core/types';
import './style.css';

interface IntroStep extends BaseStep {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  begin: string;
}

/** Opening screen: big title and a single "begin" button. Hides the bottom navigation. */
export default defineStep<IntroStep>({
  label: 'Intro',
  description: 'Opening screen with a title and a begin button.',
  hideNav: true,
  fields: [
    { key: 'eyebrow', label: 'Eyebrow', kind: 'text', help: 'Small line above the title.' },
    { key: 'title', label: 'Title', kind: 'text' },
    { key: 'subtitle', label: 'Subtitle', kind: 'textarea' },
    { key: 'begin', label: 'Button label', kind: 'text' },
  ],
  create: () => ({ title: 'Hello, {recipient}', subtitle: 'I made something for you.', begin: 'Begin' }),
  mount(el, cfg, ctx) {
    const parts = compact<HTMLElement>([
      cfg.eyebrow && h('p', { class: 'eyebrow' }, ctx.fill(cfg.eyebrow)),
      h('h1', { class: 'intro__title' }, ctx.fill(cfg.title)),
      cfg.subtitle && h('p', { class: 'intro__subtitle' }, ctx.fill(cfg.subtitle)),
      h('button', { class: 'btn btn--primary intro__begin', type: 'button', onclick: () => ctx.next() }, ctx.fill(cfg.begin)),
    ]);
    el.append(...reveal(parts));
  },
});
