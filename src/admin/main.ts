import { conditionOps } from '../core/conditions';
import { h } from '../core/dom';
import { DRAFT_KEY } from '../core/preview';
import type { Field } from '../core/schema';
import type { BaseStep, Condition, StoryConfig } from '../core/types';
import { stepTypes } from '../steps';
import { api } from './api';
import { iconBtn, renderField, renderFields } from './fields';
import { storyGroups, themePresets } from './story-fields';
import { validate } from './validate';
import './admin.css';

type Selection = 'story' | 'json' | number;

const UI_KEY = 'kairos-genesis:admin-ui';

const state = {
  story: null as unknown as StoryConfig,
  saved: '',
  selected: 'story' as Selection,
  device: 'phone' as 'phone' | 'desktop',
  history: [] as string[],
  future: [] as string[],
};

// ---------- Layout ----------

const status = h('span', { class: 'status' });
const undoBtn = h('button', { class: 'btn-admin btn-admin--ghost', type: 'button', title: 'Undo (Ctrl+Z outside inputs)', onclick: () => undo() }, '↶');
const redoBtn = h('button', { class: 'btn-admin btn-admin--ghost', type: 'button', title: 'Redo (Ctrl+Shift+Z)', onclick: () => redo() }, '↷');
const saveBtn = h('button', { class: 'btn-admin', type: 'button', title: 'Save to src/story.json (Ctrl+S)', onclick: () => save() }, 'Save');
const revertBtn = h('button', { class: 'btn-admin btn-admin--ghost', type: 'button', title: 'Throw away unsaved changes', onclick: () => revert() }, 'Revert');
const importInput = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
const topbar = h('header', { class: 'topbar' },
  h('div', { class: 'brand' }, h('span', { class: 'brand__mark' }, '◎'), h('span', null, 'Kairos admin')),
  status,
  h('div', { class: 'topbar__actions' },
    undoBtn,
    redoBtn,
    h('button', { class: 'btn-admin btn-admin--ghost', type: 'button', onclick: () => exportJson() }, 'Export'),
    h('button', { class: 'btn-admin btn-admin--ghost', type: 'button', onclick: () => importInput.click() }, 'Import'),
    importInput,
    h('a', { class: 'btn-admin btn-admin--ghost', href: '/', target: '_blank', rel: 'noopener', title: 'Open the saved site in a new tab' }, 'Open site ↗'),
    revertBtn,
    saveBtn,
  ),
);

const sidebar = h('aside', { class: 'sidebar' });
const editor = h('main', { class: 'editor' });
const frame = h('iframe', { class: 'preview__frame', title: 'Live preview' });
const preview = h('section', { class: 'preview' },
  h('div', { class: 'preview__bar' },
    h('span', { class: 'preview__label' }, 'Live preview'),
    h('button', { class: 'btn-admin btn-admin--ghost btn-admin--small', type: 'button', onclick: () => toggleDevice() }, 'Phone / desktop'),
    h('button', { class: 'btn-admin btn-admin--ghost btn-admin--small', type: 'button', title: 'Forget the answers given inside the preview', onclick: () => resetPreviewAnswers() }, 'Reset answers'),
  ),
  h('div', { class: 'preview__stage' }, h('div', { class: 'preview__device' }, frame)),
);
document.getElementById('admin')!.append(topbar, h('div', { class: 'workspace' }, sidebar, editor, preview));

// ---------- State changes ----------

let draftTimer = 0;
let historyTimer = 0;
let lastSnapshot = '';

/** Every edit funnels through here. `structural`: re-render the editor too. */
function changed(structural = false): void {
  clearTimeout(historyTimer);
  historyTimer = window.setTimeout(() => {
    const now = JSON.stringify(state.story);
    if (now !== lastSnapshot) {
      state.history.push(lastSnapshot);
      if (state.history.length > 100) state.history.shift();
      state.future = [];
      lastSnapshot = now;
      paintTopbar();
    }
  }, 400);
  clearTimeout(draftTimer);
  draftTimer = window.setTimeout(writeDraft, 250);
  renderSidebar();
  if (structural) renderEditor();
  paintTopbar();
}

function writeDraft(): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(state.story));
  } catch {
    /* storage full or blocked: the preview just won't update */
  }
}

function replaceStory(next: StoryConfig, opts: { recordHistory?: boolean } = {}): void {
  if (opts.recordHistory !== false) {
    state.history.push(JSON.stringify(state.story));
    state.future = [];
  }
  state.story = next;
  lastSnapshot = JSON.stringify(next);
  if (typeof state.selected === 'number' && state.selected >= next.steps.length) state.selected = 'story';
  writeDraft();
  renderAll();
}

function undo(): void {
  const prev = state.history.pop();
  if (prev === undefined) return;
  state.future.push(JSON.stringify(state.story));
  replaceStory(JSON.parse(prev), { recordHistory: false });
}

function redo(): void {
  const next = state.future.pop();
  if (next === undefined) return;
  state.history.push(JSON.stringify(state.story));
  replaceStory(JSON.parse(next), { recordHistory: false });
}

const isDirty = () => JSON.stringify(state.story) !== state.saved;

async function save(): Promise<void> {
  saveBtn.disabled = true;
  try {
    await api.save(state.story);
    state.saved = JSON.stringify(state.story);
    flash('Saved to src/story.json');
  } catch (err) {
    flash(`Save failed: ${(err as Error).message}`, true);
  } finally {
    saveBtn.disabled = false;
    paintTopbar();
  }
}

function revert(): void {
  if (!isDirty() || !confirm('Throw away all unsaved changes?')) return;
  replaceStory(JSON.parse(state.saved));
}

function exportJson(): void {
  const blob = new Blob([`${JSON.stringify(state.story, null, 2)}\n`], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: 'story.json' });
  a.click();
  URL.revokeObjectURL(a.href);
}

importInput.addEventListener('change', async () => {
  const file = importInput.files?.[0];
  importInput.value = '';
  if (!file) return;
  try {
    const next = JSON.parse(await file.text()) as StoryConfig;
    if (!next.meta || !Array.isArray(next.steps)) throw new Error('needs "meta" and "steps"');
    replaceStory(next);
    flash(`Imported ${file.name}. Not saved yet.`);
  } catch (err) {
    flash(`Import failed: ${(err as Error).message}`, true);
  }
});

let flashTimer = 0;
function flash(message: string, error = false): void {
  status.textContent = message;
  status.classList.toggle('status--error', error);
  status.classList.add('status--flash');
  clearTimeout(flashTimer);
  flashTimer = window.setTimeout(paintTopbar, 3000);
}

function paintTopbar(): void {
  if (status.classList.contains('status--flash') && flashTimer) {
    status.classList.remove('status--flash');
  }
  const dirty = isDirty();
  status.textContent = dirty ? 'Unsaved changes' : 'All changes saved';
  status.classList.toggle('status--dirty', dirty);
  status.classList.remove('status--error');
  saveBtn.classList.toggle('btn-admin--pulse', dirty);
  revertBtn.disabled = !dirty;
  undoBtn.disabled = !state.history.length;
  redoBtn.disabled = !state.future.length;
}

// ---------- Selection & preview ----------

function select(sel: Selection): void {
  state.selected = sel;
  try {
    sessionStorage.setItem(UI_KEY, JSON.stringify({ selected: sel, device: state.device }));
  } catch {
    /* ignore */
  }
  renderSidebar();
  renderEditor();
  if (typeof sel === 'number') showInPreview(sel);
}

function showInPreview(index: number): void {
  writeDraft();
  frame.src = `/?preview&step=${index + 1}`;
}

function toggleDevice(): void {
  state.device = state.device === 'phone' ? 'desktop' : 'phone';
  preview.classList.toggle('preview--desktop', state.device === 'desktop');
}

function resetPreviewAnswers(): void {
  try {
    localStorage.removeItem(`${state.story.meta.storageKey}:preview:answers`);
  } catch {
    /* ignore */
  }
  frame.contentWindow?.location.reload();
}

// ---------- Sidebar ----------

function stepTitle(step: BaseStep): string {
  const text = [step.title, step.eyebrow, (step.lines as string[] | undefined)?.[0]].find((v) => typeof v === 'string' && v);
  return (text as string | undefined) ?? '(untitled)';
}

let dragFrom = -1;

function renderSidebar(): void {
  const issues = validate(state.story);
  const issuesFor = (i: number) => issues.filter((x) => x.step === i);
  const item = (sel: Selection, label: string, extra?: HTMLElement | null) =>
    h('button', { class: `nav-item${state.selected === sel ? ' is-selected' : ''}`, type: 'button', onclick: () => select(sel) }, h('span', null, label), extra ?? null);

  const storyIssues = issuesFor(-1);
  const list = h('ol', { class: 'steps' });
  state.story.steps.forEach((step, i) => {
    const module = stepTypes[step.type];
    const problems = issuesFor(i);
    const li = h('li', { class: `step-item${state.selected === i ? ' is-selected' : ''}`, draggable: 'true' },
      h('button', { class: 'step-item__main', type: 'button', onclick: () => select(i) },
        h('span', { class: 'step-item__num' }, String(i + 1)),
        h('span', { class: 'step-item__text' },
          h('span', { class: 'step-item__type' }, module?.label ?? step.type, step.id ? h('code', null, step.id) : null, step.when?.length ? h('span', { class: 'tag', title: 'Shown only under conditions' }, 'if') : null),
          h('span', { class: 'step-item__title' }, stepTitle(step)),
        ),
        problems.length ? h('span', { class: 'badge', title: problems.map((p) => p.message).join('\n') }, '!') : null,
      ),
    );
    li.addEventListener('dragstart', (e) => { dragFrom = i; e.dataTransfer?.setData('text/plain', String(i)); li.classList.add('is-dragging'); });
    li.addEventListener('dragend', () => li.classList.remove('is-dragging'));
    li.addEventListener('dragover', (e) => { e.preventDefault(); li.classList.add('is-drop'); });
    li.addEventListener('dragleave', () => li.classList.remove('is-drop'));
    li.addEventListener('drop', (e) => {
      e.preventDefault();
      li.classList.remove('is-drop');
      if (dragFrom < 0 || dragFrom === i) return;
      moveStep(dragFrom, i);
      dragFrom = -1;
    });
    list.append(li);
  });

  const addSelect = h('select', { class: 'input', 'aria-label': 'Add a step' },
    h('option', { value: '' }, '+ Add step…'),
    ...Object.entries(stepTypes).map(([type, m]) => h('option', { value: type, title: m.description }, `${m.label} – ${m.description}`)));
  addSelect.addEventListener('change', () => {
    if (addSelect.value) addStep(addSelect.value);
    addSelect.value = '';
  });

  sidebar.replaceChildren(
    h('div', { class: 'sidebar__group' },
      item('story', 'Story settings', storyIssues.length ? h('span', { class: 'badge', title: storyIssues.map((p) => p.message).join('\n') }, '!') : null),
      item('json', 'Raw JSON'),
    ),
    h('div', { class: 'sidebar__heading' }, h('span', null, `Steps (${state.story.steps.length})`), h('span', { class: 'sidebar__hint' }, 'drag to reorder')),
    list,
    addSelect,
  );
}

function addStep(type: string): void {
  const module = stepTypes[type];
  const step: BaseStep = { type, ...structuredClone(module.create()) };
  if (module.collects) step.id = uniqueId(type);
  const at = typeof state.selected === 'number' ? state.selected + 1 : state.story.steps.length;
  state.story.steps.splice(at, 0, step);
  changed();
  select(at);
}

function uniqueId(base: string): string {
  const ids = new Set(state.story.steps.map((s) => s.id));
  let n = 1;
  while (ids.has(`${base}${n}`)) n += 1;
  return `${base}${n}`;
}

function moveStep(from: number, to: number): void {
  const [step] = state.story.steps.splice(from, 1);
  state.story.steps.splice(to, 0, step);
  changed();
  select(to);
}

// ---------- Editor ----------

function renderEditor(): void {
  const sel = state.selected;
  if (sel === 'story') editor.replaceChildren(storyEditor());
  else if (sel === 'json') editor.replaceChildren(jsonEditor());
  else if (state.story.steps[sel]) editor.replaceChildren(stepEditor(sel));
  else select('story');
}

function section(title: string, ...children: (HTMLElement | null)[]): HTMLElement {
  return h('section', { class: 'panel' }, h('h3', { class: 'panel__title' }, title), ...children);
}

function storyEditor(): HTMLElement {
  const story = state.story as unknown as Record<string, unknown>;
  const presets = h('div', { class: 'presets' }, ...themePresets.map((p) => h('button', {
    class: 'preset',
    type: 'button',
    title: `Apply "${p.name}"`,
    style: `--p-bg:${p.theme.bg};--p-accent:${p.theme.accent};--p-text:${p.theme.text}`,
    onclick: () => {
      state.story.theme = { ...state.story.theme, ...p.theme };
      changed(true);
    },
  }, h('span', { class: 'preset__swatch' }), p.name)));

  const groups = storyGroups.map((g) => section(g.title,
    g.title === 'Theme' ? h('div', { class: 'field-row' }, h('span', { class: 'field-label' }, 'Presets'), presets) : null,
    renderFields(g.fields, story, (s) => changed(s))));

  return h('div', { class: 'editor__inner' },
    h('header', { class: 'editor__header' }, h('h2', null, 'Story settings'), h('p', null, 'Everything that is not a single step: names, colors, fonts and how answers come back to you.')),
    section('Placeholders', h('p', { class: 'field-help' }, 'Use them as {name} in any text. Answers work the same way: {place} shows the answer of the step with ID "place".'), varsEditor()),
    ...groups,
  );
}

function varsEditor(): HTMLElement {
  const entries = Object.entries(state.story.vars ?? {});
  const commit = (structural = false) => {
    state.story.vars = Object.fromEntries(entries.filter(([k]) => k.trim()));
    changed(structural);
  };
  const rows = entries.map((entry, i) => {
    const key = h('input', { class: 'input input--short', value: entry[0], placeholder: 'name', 'aria-label': 'Placeholder name' });
    const value = h('input', { class: 'input', value: entry[1], placeholder: 'value', 'aria-label': 'Placeholder value' });
    key.addEventListener('input', () => { entry[0] = key.value.replace(/\W/g, ''); commit(); });
    value.addEventListener('input', () => { entry[1] = value.value; commit(); });
    return h('div', { class: 'kv' }, h('code', null, '{'), key, h('code', null, '}'), value, iconBtn('✕', 'Remove', false, () => { entries.splice(i, 1); commit(true); }));
  });
  const add = h('button', { class: 'btn-admin btn-admin--ghost', type: 'button', onclick: () => { entries.push([`var${entries.length + 1}`, '']); commit(true); } }, '+ Add placeholder');
  return h('div', { class: 'kv-list' }, ...rows, add);
}

function jsonEditor(): HTMLElement {
  const area = h('textarea', { class: 'input json', spellcheck: 'false' });
  area.value = JSON.stringify(state.story, null, 2);
  const error = h('p', { class: 'field-help field-help--error' });
  const apply = h('button', { class: 'btn-admin', type: 'button' }, 'Apply JSON');
  apply.addEventListener('click', () => {
    try {
      const next = JSON.parse(area.value) as StoryConfig;
      if (!next.meta || !Array.isArray(next.steps)) throw new Error('needs "meta" and "steps"');
      error.textContent = '';
      replaceStory(next);
      flash('JSON applied. Not saved yet.');
    } catch (err) {
      error.textContent = (err as Error).message;
    }
  });
  return h('div', { class: 'editor__inner editor__inner--wide' },
    h('header', { class: 'editor__header' }, h('h2', null, 'Raw JSON'), h('p', null, 'The whole story as stored in src/story.json. Edit anything, then apply.')),
    area, error, apply);
}

const appearanceFields: Field[] = [
  { key: 'appearance.align', label: 'Vertical position', kind: 'select', options: [{ value: 'center', label: 'Centered' }, { value: 'start', label: 'Top' }] },
  { key: 'appearance.background', label: 'Background image', kind: 'image' },
  { key: 'appearance.overlay', label: 'Darken background (0–1)', kind: 'number', min: 0, max: 1, step: 0.05 },
  { key: 'appearance.accent', label: 'Accent color for this step', kind: 'color' },
  { key: 'appearance.className', label: 'CSS class', kind: 'text', help: 'Style it in src/styles/custom.css.' },
];

function stepEditor(index: number): HTMLElement {
  const step = state.story.steps[index];
  const module = stepTypes[step.type];
  const issues = validate(state.story).filter((x) => x.step === index);
  const onChange = (s?: boolean) => changed(s);

  const actions = h('div', { class: 'editor__actions' },
    h('button', { class: 'btn-admin btn-admin--ghost btn-admin--small', type: 'button', onclick: () => showInPreview(index) }, 'Preview'),
    iconBtn('↑', 'Move up', index === 0, () => moveStep(index, index - 1)),
    iconBtn('↓', 'Move down', index === state.story.steps.length - 1, () => moveStep(index, index + 1)),
    iconBtn('⧉', 'Duplicate', false, () => {
      const copy = structuredClone(step);
      if (copy.id) copy.id = uniqueId(copy.id.replace(/\d+$/, ''));
      state.story.steps.splice(index + 1, 0, copy);
      changed();
      select(index + 1);
    }),
    iconBtn('🗑', 'Delete', false, () => {
      if (!confirm(`Delete step ${index + 1}?`)) return;
      state.story.steps.splice(index, 1);
      changed();
      select(state.story.steps.length ? Math.min(index, state.story.steps.length - 1) : 'story');
    }),
  );

  if (!module) {
    return h('div', { class: 'editor__inner' }, h('header', { class: 'editor__header' }, h('h2', null, `Unknown type "${step.type}"`), actions), h('p', null, 'Register it in src/steps/index.ts or edit it in Raw JSON.'));
  }

  const requiredDefault = module.requiredByDefault ?? false;
  const answerFields: Field[] = [
    { key: 'id', label: 'Answer ID', kind: 'text', help: 'Letters, digits, _. Use it as {id} in texts and in conditions.' },
    { key: 'recapLabel', label: 'Label in the final recap', kind: 'text', placeholder: typeof step.title === 'string' ? step.title : '' },
  ];
  const required = h('select', { class: 'input' },
    h('option', { value: '' }, `Default (${requiredDefault ? 'required' : 'optional'})`),
    h('option', { value: 'true', selected: step.required === true }, 'Required: must answer to continue'),
    h('option', { value: 'false', selected: step.required === false }, 'Optional: can skip'));
  required.addEventListener('change', () => {
    if (required.value === '') delete step.required;
    else step.required = required.value === 'true';
    changed();
  });

  return h('div', { class: 'editor__inner' },
    h('header', { class: 'editor__header' },
      h('div', null, h('p', { class: 'editor__eyebrow' }, `Step ${index + 1} · ${module.label}`), h('h2', null, stepTitle(step)), h('p', null, module.description)),
      actions),
    issues.length ? h('ul', { class: 'issues' }, ...issues.map((i) => h('li', null, i.message))) : null,
    section('Content', renderFields(module.fields, step, onChange)),
    module.collects
      ? section('Answer', renderFields(answerFields, step, onChange), h('div', { class: 'field-row' }, h('span', { class: 'field-label' }, 'Required'), required))
      : null,
    section('Show this step only if…', conditionsEditor(index)),
    section('Appearance', renderFields(appearanceFields, step, onChange)),
    section('Private note', renderField({ key: 'note', label: 'Only you see this', kind: 'textarea' }, step, onChange)),
  );
}

function conditionsEditor(index: number): HTMLElement {
  const step = state.story.steps[index];
  const conditions: Condition[] = step.when ?? [];
  const sources = state.story.steps.slice(0, index).filter((s) => s.id);
  const commit = (structural = false) => {
    if (conditions.length) step.when = conditions;
    else delete step.when;
    changed(structural);
  };

  if (!sources.length && !conditions.length) {
    return h('p', { class: 'field-help' }, 'No earlier step collects an answer yet, so there is nothing to depend on.');
  }

  const rows = conditions.map((c, i) => {
    const source = h('select', { class: 'input input--short', 'aria-label': 'Answer' },
      ...sources.map((s) => h('option', { value: s.id!, selected: s.id === c.id }, `${s.id} (${stepTypes[s.type]?.label ?? s.type})`)),
      sources.some((s) => s.id === c.id) ? null : h('option', { value: c.id, selected: true }, `${c.id} (missing)`));
    const op = h('select', { class: 'input input--short', 'aria-label': 'Operator' }, ...conditionOps.map((o) => h('option', { value: o.value, selected: o.value === c.op }, o.label)));
    const listId = `opts-${index}-${i}`;
    const options = (state.story.steps.find((s) => s.id === c.id)?.options as { value: string; label: string }[] | undefined) ?? [];
    const value = h('input', { class: 'input', value: c.value === undefined ? '' : String(c.value), list: listId, placeholder: 'value', 'aria-label': 'Value', hidden: c.op === 'answered' });
    const datalist = h('datalist', { id: listId }, ...options.map((o) => h('option', { value: o.value }, o.label)));
    source.addEventListener('change', () => { c.id = source.value; commit(true); });
    op.addEventListener('change', () => { c.op = op.value as Condition['op']; commit(true); });
    value.addEventListener('input', () => {
      const raw = value.value;
      c.value = raw === 'true' ? true : raw === 'false' ? false : raw !== '' && !Number.isNaN(Number(raw)) && (c.op === 'gte' || c.op === 'lte') ? Number(raw) : raw;
      commit();
    });
    return h('div', { class: 'condition' }, source, op, value, datalist, iconBtn('✕', 'Remove condition', false, () => { conditions.splice(i, 1); commit(true); }));
  });

  const add = h('button', {
    class: 'btn-admin btn-admin--ghost',
    type: 'button',
    disabled: !sources.length,
    onclick: () => { conditions.push({ id: sources[sources.length - 1].id!, op: 'equals', value: '' }); commit(true); },
  }, '+ Add condition');

  return h('div', { class: 'conditions' },
    conditions.length ? h('p', { class: 'field-help' }, 'All conditions must hold. Hidden steps are skipped and left out of the recap.') : null,
    ...rows, add);
}

// ---------- Boot ----------

function renderAll(): void {
  renderSidebar();
  renderEditor();
  paintTopbar();
}

window.addEventListener('keydown', (e) => {
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.key.toLowerCase() === 's') {
    e.preventDefault();
    void save();
  }
  const typing = (e.target as HTMLElement).closest('input, textarea, select');
  if (mod && e.key.toLowerCase() === 'z' && !typing) {
    e.preventDefault();
    if (e.shiftKey) redo();
    else undo();
  }
});

window.addEventListener('beforeunload', (e) => {
  if (isDirty()) e.preventDefault();
});

async function boot(): Promise<void> {
  let saved: StoryConfig;
  try {
    saved = await api.load();
  } catch (err) {
    editor.replaceChildren(h('p', { class: 'field-help field-help--error' }, `Could not load the story: ${(err as Error).message}. The admin only works with the dev server (npm run dev).`));
    return;
  }
  state.saved = JSON.stringify(saved);
  let story = saved;
  let restored = false;
  try {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft && draft !== state.saved) {
      story = JSON.parse(draft) as StoryConfig;
      restored = true;
    }
    const ui = JSON.parse(sessionStorage.getItem(UI_KEY) ?? '{}') as { selected?: Selection; device?: 'phone' | 'desktop' };
    if (ui.selected !== undefined) state.selected = ui.selected;
    if (ui.device === 'desktop') toggleDevice();
  } catch {
    /* fresh start */
  }
  state.story = story;
  lastSnapshot = JSON.stringify(story);
  writeDraft();
  if (typeof state.selected === 'number' && !story.steps[state.selected]) state.selected = 'story';
  renderAll();
  frame.src = `/?preview&step=${typeof state.selected === 'number' ? state.selected + 1 : 1}`;
  if (restored) flash('Restored your unsaved draft');
}

void boot();
