type Child = Node | string | number | null | undefined | false;
type AttrValue = string | number | boolean | null | undefined | EventListener;

/**
 * Tiny hyperscript helper.
 *   h('button', { class: 'btn', onclick: () => ... }, 'Label')
 * Keys starting with `on` become event listeners, `false`/`null`/`undefined` values are skipped,
 * `true` sets an empty attribute.
 */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, AttrValue> | null,
  ...children: (Child | Child[])[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (value === null || value === undefined || value === false) continue;
      if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key === 'style' && typeof value === 'string') {
        el.style.cssText = value;
      } else {
        el.setAttribute(key, value === true ? '' : String(value));
      }
    }
  }
  append(el, children);
  return el;
}

export function append(parent: Element, children: (Child | Child[])[]): void {
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    parent.append(child instanceof Node ? child : String(child));
  }
}

/**
 * Mark elements for the staggered entrance animation (see `.reveal` in base.css).
 * The animation replays every time the step becomes active.
 */
export function reveal<T extends HTMLElement>(elements: T[], start = 0): T[] {
  elements.forEach((el, i) => {
    el.classList.add('reveal');
    el.style.setProperty('--i', String(start + i));
  });
  return elements;
}

/** Heading block most steps share: optional eyebrow, title, subtitle. */
export function stepHeader(
  fill: (s: string) => string,
  opts: { eyebrow?: string; title?: string; subtitle?: string },
): HTMLElement {
  const header = h('header', { class: 'step-header' });
  const parts = compact<HTMLElement>([
    opts.eyebrow && h('p', { class: 'eyebrow' }, fill(opts.eyebrow)),
    opts.title && h('h2', { class: 'step-title' }, fill(opts.title)),
    opts.subtitle && h('p', { class: 'step-subtitle' }, fill(opts.subtitle)),
  ]);
  append(header, reveal(parts));
  return header;
}

/** Drop falsy entries (handy for `cond && h(...)` lists). */
export function compact<T>(items: (T | '' | 0 | null | undefined | false)[]): T[] {
  return items.filter(Boolean) as T[];
}
