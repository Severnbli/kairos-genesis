import { h, reveal, stepHeader } from '../../core/dom';
import { defineStep, type BaseStep } from '../../core/types';
import './style.css';

interface MessageStep extends BaseStep {
  variant: 'letter' | 'quote';
  eyebrow?: string;
  title?: string;
  lines: string[];
  signature?: string;
  button?: string;
}

/**
 * Text only: a short letter or a centered quote. Re-renders on every visit, so `{id}`
 * placeholders show answers given on earlier steps ("So, {place} it is.").
 */
export default defineStep<MessageStep>({
  label: 'Message',
  description: 'A letter or a quote. Can reference earlier answers with {id}.',
  fields: [
    { key: 'variant', label: 'Style', kind: 'select', options: [{ value: 'letter', label: 'Letter' }, { value: 'quote', label: 'Quote' }] },
    { key: 'eyebrow', label: 'Eyebrow', kind: 'text' },
    { key: 'title', label: 'Title', kind: 'text' },
    { key: 'lines', label: 'Paragraphs', kind: 'lines', help: 'One paragraph per line.' },
    { key: 'signature', label: 'Signature', kind: 'text' },
    { key: 'button', label: 'Continue button', kind: 'text', help: 'Optional. Adds a button that goes to the next step.' },
  ],
  create: () => ({ variant: 'letter', lines: ['Write something here.'] }),
  mount(el, cfg, ctx) {
    el.classList.add(`message--${cfg.variant ?? 'letter'}`);
    const render = () => {
      el.replaceChildren();
      if (cfg.variant === 'quote') {
        const quote = h('blockquote', { class: 'message__quote' }, ...cfg.lines.map((l) => h('p', null, ctx.fill(l))));
        const by = cfg.signature ? h('p', { class: 'message__by' }, ctx.fill(cfg.signature)) : null;
        el.append(...reveal([quote, ...(by ? [by] : [])]));
      } else {
        if (cfg.eyebrow || cfg.title) el.append(stepHeader(ctx.fill, cfg));
        const paras = cfg.lines.map((l) => h('p', { class: 'message__line' }, ctx.fill(l)));
        const sig = cfg.signature ? [h('p', { class: 'message__signature' }, ctx.fill(cfg.signature))] : [];
        el.append(...reveal([...paras, ...sig], 2));
      }
      if (cfg.button) {
        const btn = h('button', { class: 'btn btn--ghost message__button', type: 'button', onclick: () => ctx.next() }, ctx.fill(cfg.button));
        el.append(...reveal([btn], cfg.lines.length + 3));
      }
    };
    render();
    return { enter: render };
  },
});
