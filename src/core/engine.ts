import { stepTypes } from '../steps';
import { matches } from './conditions';
import { h } from './dom';
import { createAnswerStore } from './store';
import type { AnswerValue, BaseStep, RecapItem, StepContext, StepInstance, StepModule, StoryConfig } from './types';

interface Scene {
  config: BaseStep;
  module: StepModule;
  el: HTMLElement;
  instance: StepInstance;
  complete: boolean;
}

export interface StoryOptions {
  /** Override the answers namespace (the admin preview uses its own). */
  storageKey?: string;
  /** Index of the step to open first. Ignores gating; meant for dev and preview. */
  startAt?: number;
  /** Called after every step change with the new index. */
  onStep?: (index: number) => void;
}

/**
 * Mounts every step once, then shows one at a time.
 * Navigation: buttons, arrow keys, horizontal swipe. Steps whose `when` does not match are
 * skipped; required steps lock "next" until they call `ctx.setComplete(true)`.
 */
export function createStory(root: HTMLElement, story: StoryConfig, opts: StoryOptions = {}): void {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scenes: Scene[] = [];
  let ready = false;
  let current = 0;
  const answers = createAnswerStore(opts.storageKey ?? story.meta.storageKey, () => update());

  const stage = h('main', { class: 'stage' });
  const backBtn = h('button', { class: 'nav__btn', type: 'button', 'aria-label': story.labels.back, onclick: () => back() }, '‹');
  const nextBtn = h('button', { class: 'nav__btn nav__btn--next', type: 'button', 'aria-label': story.labels.next, onclick: () => next() }, '›');
  const bar = h('span', { class: 'nav__bar' });
  const progress = h('div', { class: 'nav__progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100 }, bar);
  const nav = h('nav', { class: 'nav' }, backBtn, progress, nextBtn);
  root.append(stage, nav);

  if (!story.steps.length) {
    stage.append(h('p', { class: 'empty' }, 'No steps yet. Add some in the admin (/admin.html).'));
    nav.remove();
    return;
  }

  const isVisible = (s: Scene) => matches(s.config.when, answers.all());

  function summarize(scene: Scene, value: AnswerValue): string {
    return scene.module.summarize?.(scene.config, value) ?? (Array.isArray(value) ? value.join(', ') : String(value));
  }

  function fill(text: string): string {
    return text.replace(/\{(\w+)\}/g, (_, key: string) => {
      if (key in story.vars) return story.vars[key];
      const scene = scenes.find((s) => s.config.id === key);
      const value = answers.get(key);
      if (scene && value !== undefined) return summarize(scene, value);
      return '…';
    });
  }

  function recap(): RecapItem[] {
    return scenes.flatMap((s) => {
      const cfg = s.config;
      if (!cfg.id || !isVisible(s)) return [];
      const value = answers.get(cfg.id);
      if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) return [];
      const title = cfg.recapLabel || (typeof cfg.title === 'string' ? cfg.title : '') || cfg.id;
      return [{ id: cfg.id, title: fill(title), value: summarize(s, value) }];
    });
  }

  story.steps.forEach((config, index) => {
    const module = stepTypes[config.type] ?? missingStep(config.type);
    const required = config.required ?? module.requiredByDefault ?? false;
    const look = config.appearance ?? {};
    const el = h('section', {
      class: ['step', `step--${config.type}`, look.align === 'start' && 'step--start', look.className].filter(Boolean).join(' '),
      'aria-hidden': 'true',
      'data-index': index,
    });
    if (look.accent) el.style.setProperty('--kg-accent', look.accent);
    if (look.background) {
      el.classList.add('step--has-bg');
      el.style.setProperty('--step-bg', `url("${look.background}")`);
      el.style.setProperty('--step-overlay', String(look.overlay ?? 0.55));
    }
    const inner = h('div', { class: 'step__inner' });
    el.append(inner);
    stage.append(el);

    const scene: Scene = { config, module, el, instance: {}, complete: !required };
    scenes.push(scene);
    const ctx: StepContext = {
      next: () => next(),
      back: () => back(),
      answers,
      setComplete(done) {
        scene.complete = !required || done;
        update();
      },
      fill,
      recap,
      story,
      reducedMotion,
    };
    scene.instance = module.mount(inner, config, ctx) ?? {};
  });

  function findVisible(from: number, dir: 1 | -1): number {
    for (let i = from + dir; i >= 0 && i < scenes.length; i += dir) {
      if (isVisible(scenes[i])) return i;
    }
    return -1;
  }

  function activate(index: number): void {
    const scene = scenes[index];
    current = index;
    scene.el.classList.add('is-active');
    scene.el.removeAttribute('aria-hidden');
    scene.el.scrollTop = 0;
    scene.instance.enter?.();
    opts.onStep?.(index);
    update();
  }

  function go(index: number): void {
    if (index < 0 || index >= scenes.length || index === current) return;
    const prev = scenes[current];
    prev.instance.leave?.();
    prev.el.classList.remove('is-active');
    prev.el.setAttribute('aria-hidden', 'true');
    activate(index);
  }

  function next(): void {
    if (!scenes[current].complete) {
      nav.classList.remove('nav--nudge');
      void nav.offsetWidth; // restart the animation
      nav.classList.add('nav--nudge');
      return;
    }
    const target = findVisible(current, 1);
    if (target !== -1) go(target);
  }

  function back(): void {
    const target = findVisible(current, -1);
    if (target !== -1) go(target);
  }

  function update(): void {
    if (!ready) return;
    const scene = scenes[current];
    const visible = scenes.filter(isVisible);
    const position = Math.max(0, visible.indexOf(scene));
    const percent = visible.length > 1 ? Math.round((position / (visible.length - 1)) * 100) : 100;
    bar.style.width = `${percent}%`;
    progress.setAttribute('aria-valuenow', String(percent));
    backBtn.disabled = findVisible(current, -1) === -1;
    nextBtn.disabled = findVisible(current, 1) === -1;
    nextBtn.classList.toggle('is-locked', !scene.complete);
    nav.classList.toggle('nav--hidden', Boolean(scene.module.hideNav));
  }

  // Keyboard: arrows navigate unless the user is typing.
  window.addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable]')) return;
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') back();
  });

  // Horizontal swipe; vertical scrolling inside a step stays untouched.
  let touch: { x: number; y: number } | null = null;
  stage.addEventListener('touchstart', (e) => {
    const onField = (e.target as HTMLElement).closest('input, textarea, select');
    touch = onField ? null : { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    if (!touch) return;
    const dx = e.changedTouches[0].clientX - touch.x;
    const dy = e.changedTouches[0].clientY - touch.y;
    touch = null;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) next();
    else back();
  }, { passive: true });

  ready = true;
  const start = Math.min(Math.max(opts.startAt ?? 0, 0), scenes.length - 1);
  activate(start);
}

function missingStep(type: string): StepModule {
  return {
    label: 'Unknown',
    description: '',
    fields: [],
    create: () => ({}),
    mount(el) {
      el.append(h('p', { class: 'empty' }, `Unknown step type "${type}". Register it in src/steps/index.ts.`));
    },
  };
}
