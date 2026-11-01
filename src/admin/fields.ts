import { h } from '../core/dom';
import { getPath, setPath, type Field } from '../core/schema';
import { api } from './api';

type Obj = Record<string, unknown>;
/** `structural` = the shape changed (list item added/removed/moved): re-render the form. */
export type OnChange = (structural?: boolean) => void;

let uid = 0;
const nextId = () => `f${++uid}`;

/** Render a group of fields bound to `target`. Edits mutate `target` in place. */
export function renderFields(fields: Field[], target: Obj, onChange: OnChange): HTMLElement {
  return h('div', { class: 'fields' }, ...fields.map((f) => renderField(f, target, onChange)));
}

export function renderField(field: Field, target: Obj, onChange: OnChange): HTMLElement {
  const id = nextId();
  const value = getPath(target, field.key);
  const set = (v: unknown, structural = false) => {
    setPath(target, field.key, v);
    onChange(structural);
  };
  const label = h('label', { class: 'field-label', for: id }, field.label);
  const help = field.help ? h('p', { class: 'field-help' }, field.help) : null;
  const wrap = (control: HTMLElement) => h('div', { class: 'field-row' }, label, control, help);

  switch (field.kind) {
    case 'text': {
      const input = h('input', { id, class: 'input', type: 'text', value: (value as string) ?? '', placeholder: field.placeholder });
      input.addEventListener('input', () => set(input.value));
      return wrap(input);
    }
    case 'textarea': {
      const input = h('textarea', { id, class: 'input', rows: 3, placeholder: field.placeholder });
      input.value = (value as string) ?? '';
      input.addEventListener('input', () => set(input.value));
      return wrap(input);
    }
    case 'number': {
      const input = h('input', { id, class: 'input input--short', type: 'number', value: value === undefined ? '' : String(value), min: field.min, max: field.max, step: field.step ?? 'any' });
      input.addEventListener('input', () => set(input.value === '' ? undefined : Number(input.value)));
      return wrap(input);
    }
    case 'boolean': {
      const input = h('input', { id, type: 'checkbox', checked: Boolean(value) });
      input.addEventListener('change', () => set(input.checked));
      return h('div', { class: 'field-row field-row--check' }, h('label', { class: 'check', for: id }, input, h('span', null, field.label)), help);
    }
    case 'select': {
      const input = h('select', { id, class: 'input' },
        h('option', { value: '' }, '–'),
        ...field.options.map((o) => h('option', { value: o.value, selected: o.value === value }, o.label)));
      input.addEventListener('change', () => set(input.value || undefined));
      return wrap(input);
    }
    case 'color': {
      const text = h('input', { id, class: 'input', type: 'text', value: (value as string) ?? '', placeholder: '#rrggbb or any CSS color' });
      const picker = h('input', { class: 'color', type: 'color', value: toHex(value as string), 'aria-label': `${field.label} picker` });
      picker.addEventListener('input', () => { text.value = picker.value; set(picker.value); });
      text.addEventListener('input', () => { picker.value = toHex(text.value); set(text.value); });
      return wrap(h('div', { class: 'color-row' }, picker, text));
    }
    case 'lines': {
      const lines = (value as string[]) ?? [];
      const input = h('textarea', { id, class: 'input', rows: Math.min(8, Math.max(3, lines.length + 1)) });
      input.value = lines.join('\n');
      input.addEventListener('input', () => {
        const next = input.value.split('\n').map((l) => l.trim()).filter(Boolean);
        set(next.length ? next : undefined);
      });
      return wrap(input);
    }
    case 'image':
      return wrap(imageControl(id, value as string | undefined, (v) => set(v)));
    case 'list':
      return listControl(field, target, onChange);
  }
}

function listControl(field: Extract<Field, { kind: 'list' }>, target: Obj, onChange: OnChange): HTMLElement {
  const items = ((getPath(target, field.key) as Obj[]) ?? []).slice();
  const commit = () => {
    setPath(target, field.key, items);
    onChange(true);
  };
  const box = h('div', { class: 'list' });

  items.forEach((item, i) => {
    const title = h('span', { class: 'list__title' });
    const paintTitle = () => { title.textContent = `${i + 1}. ${String(item.label || item.value || field.itemLabel)}`; };
    paintTitle();
    const head = h('div', { class: 'list__head' },
      title,
      iconBtn('↑', 'Move up', i === 0, () => { [items[i - 1], items[i]] = [items[i], items[i - 1]]; commit(); }),
      iconBtn('↓', 'Move down', i === items.length - 1, () => { [items[i + 1], items[i]] = [items[i], items[i + 1]]; commit(); }),
      iconBtn('⧉', 'Duplicate', false, () => { items.splice(i + 1, 0, structuredClone(item)); commit(); }),
      iconBtn('✕', 'Remove', false, () => { items.splice(i, 1); commit(); }),
    );
    const body = renderFields(field.item, item, (structural) => {
      paintTitle();
      setPath(target, field.key, items);
      onChange(structural);
    });
    box.append(h('details', { class: 'list__item' }, h('summary', null, head), body));
  });

  const add = h('button', {
    class: 'btn-admin btn-admin--ghost',
    type: 'button',
    onclick: () => { items.push(field.create()); commit(); },
  }, `+ Add ${field.itemLabel.toLowerCase()}`);
  return h('div', { class: 'field-row' }, h('span', { class: 'field-label' }, field.label), box, add);
}

/** Text input + upload + media library picker + thumbnail. */
export function imageControl(id: string, value: string | undefined, set: (v: string | undefined) => void): HTMLElement {
  const input = h('input', { id, class: 'input', type: 'text', value: value ?? '', placeholder: 'media/photo.jpg or https://…' });
  const thumb = h('img', { class: 'thumb', alt: '' });
  const paint = () => {
    thumb.hidden = !input.value;
    if (input.value) thumb.src = input.value;
  };
  input.addEventListener('input', () => { set(input.value || undefined); paint(); });

  const file = h('input', { type: 'file', accept: 'image/*', hidden: true });
  file.addEventListener('change', async () => {
    const f = file.files?.[0];
    if (!f) return;
    try {
      const { url } = await api.upload(f);
      input.value = url;
      set(url);
      paint();
    } catch (err) {
      alert(`Upload failed: ${(err as Error).message}`);
    }
  });
  const upload = h('button', { class: 'btn-admin btn-admin--ghost', type: 'button', onclick: () => file.click() }, 'Upload');

  const pick = h('select', { class: 'input input--short', 'aria-label': 'Choose uploaded media' }, h('option', { value: '' }, 'Library…'));
  pick.addEventListener('focus', async () => {
    const files = await api.media().catch(() => [] as string[]);
    pick.replaceChildren(h('option', { value: '' }, 'Library…'), ...files.map((f) => h('option', { value: f }, f.replace('media/', ''))));
  });
  pick.addEventListener('change', () => {
    if (!pick.value) return;
    input.value = pick.value;
    set(pick.value);
    paint();
  });

  paint();
  return h('div', { class: 'image-control' }, h('div', { class: 'image-control__row' }, input, upload, pick, file), thumb);
}

export function iconBtn(icon: string, label: string, disabled: boolean, onclick: () => void): HTMLButtonElement {
  return h('button', {
    class: 'icon-btn',
    type: 'button',
    title: label,
    'aria-label': label,
    disabled,
    onclick: (e: Event) => { e.preventDefault(); e.stopPropagation(); onclick(); },
  }, icon);
}

function toHex(color: string | undefined): string {
  if (color && /^#[0-9a-f]{6}$/i.test(color)) return color;
  if (color && /^#[0-9a-f]{3}$/i.test(color)) return `#${[...color.slice(1)].map((c) => c + c).join('')}`;
  return '#000000';
}
