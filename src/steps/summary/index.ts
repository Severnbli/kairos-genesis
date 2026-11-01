import { h, reveal, stepHeader } from '../../core/dom';
import { postAnswers, recapText, shareLinks } from '../../core/submit';
import { defineStep, type BaseStep } from '../../core/types';
import './style.css';

interface SummaryStep extends BaseStep {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** First line of the message that gets sent / shared. */
  messageHeading: string;
  sendLabel: string;
  sentText: string;
  errorText: string;
  shareLabel: string;
  copiedText: string;
  restartLabel?: string;
}

/**
 * Recap of every answer plus ways to send it back: POST to an endpoint, messenger deep links,
 * native share / clipboard. Channels are configured in story.json → `submit`.
 */
export default defineStep<SummaryStep>({
  label: 'Summary & send',
  description: 'Shows all answers and a way to send them back to you.',
  fields: [
    { key: 'eyebrow', label: 'Eyebrow', kind: 'text' },
    { key: 'title', label: 'Title', kind: 'text' },
    { key: 'subtitle', label: 'Subtitle', kind: 'textarea' },
    { key: 'messageHeading', label: 'Message heading', kind: 'text', help: 'First line of the shared text.' },
    { key: 'sendLabel', label: 'Send button (endpoint)', kind: 'text' },
    { key: 'sentText', label: 'After sending', kind: 'text' },
    { key: 'errorText', label: 'If sending fails', kind: 'text' },
    { key: 'shareLabel', label: 'Share / copy button', kind: 'text' },
    { key: 'copiedText', label: 'After copying', kind: 'text' },
    { key: 'restartLabel', label: 'Start over link', kind: 'text', help: 'Leave empty to hide.' },
  ],
  create: () => ({
    title: 'Here is our plan',
    messageHeading: 'Our plan ✨',
    sendLabel: 'Send it to {author}',
    sentText: 'Sent. See you soon.',
    errorText: 'Something went wrong. Try another way below.',
    shareLabel: 'Copy / share',
    copiedText: 'Copied.',
  }),
  mount(el, cfg, ctx) {
    const list = h('dl', { class: 'summary__list' });
    const status = h('p', { class: 'summary__status', 'aria-live': 'polite' });
    const actions = h('div', { class: 'summary__actions' });
    el.append(stepHeader(ctx.fill, cfg), list, actions, status);

    const render = () => {
      const recap = ctx.recap();
      const text = recapText(recap, ctx.fill(cfg.messageHeading));
      list.replaceChildren(...reveal(recap.flatMap((r) => [h('div', { class: 'summary__row' }, h('dt', null, r.title), h('dd', null, r.value))]), 3));
      status.textContent = '';
      actions.replaceChildren();
      const { submit } = ctx.story;

      if (submit.endpoint) {
        const send = h('button', { class: 'btn btn--primary', type: 'button' }, ctx.fill(cfg.sendLabel));
        send.addEventListener('click', async () => {
          send.disabled = true;
          const ok = await postAnswers(submit.endpoint!, ctx.story, ctx.answers.all(), recap);
          status.textContent = ctx.fill(ok ? cfg.sentText : cfg.errorText);
          send.disabled = ok;
        });
        actions.append(send);
      }
      for (const link of shareLinks(ctx.story, text)) {
        const a = h('a', { class: 'btn btn--ghost', href: link.href, target: '_blank', rel: 'noopener' }, link.label);
        if (link.copyFirst) {
          a.addEventListener('click', () => {
            navigator.clipboard?.writeText(text).then(() => { status.textContent = ctx.fill(cfg.copiedText); }, () => {});
          });
        }
        actions.append(a);
      }
      if (submit.share !== false) {
        actions.append(h('button', {
          class: 'btn btn--ghost',
          type: 'button',
          onclick: async () => {
            try {
              if (navigator.share) await navigator.share({ title: ctx.story.meta.title, text });
              else {
                await navigator.clipboard.writeText(text);
                status.textContent = ctx.fill(cfg.copiedText);
              }
            } catch {
              /* share sheet dismissed */
            }
          },
        }, ctx.fill(cfg.shareLabel)));
      }
      if (cfg.restartLabel) {
        actions.append(h('button', { class: 'btn btn--link', type: 'button', onclick: () => { ctx.answers.clear(); location.reload(); } }, ctx.fill(cfg.restartLabel)));
      }
      reveal([...actions.children] as HTMLElement[], recap.length + 3);
    };

    return { enter: render };
  },
});
