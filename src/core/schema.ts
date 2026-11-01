/**
 * Field descriptors. Step modules declare their editable fields with these and the admin
 * renders a form from them, so a new step type gets an editor for free.
 * `key` is a property path on the step config (dots allowed: "appearance.accent").
 */
interface FieldBase {
  key: string;
  label: string;
  help?: string;
}

export type Field =
  | (FieldBase & { kind: 'text' | 'textarea'; placeholder?: string })
  | (FieldBase & { kind: 'number'; min?: number; max?: number; step?: number })
  | (FieldBase & { kind: 'boolean' })
  | (FieldBase & { kind: 'color' })
  | (FieldBase & { kind: 'image' })
  | (FieldBase & { kind: 'select'; options: { value: string; label: string }[] })
  /** string[] edited as one item per line. */
  | (FieldBase & { kind: 'lines' })
  /** Array of objects, each edited with its own sub-fields. */
  | (FieldBase & { kind: 'list'; item: Field[]; itemLabel: string; create: () => Record<string, unknown> });

export function getPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, k) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[k] : undefined), obj);
}

export function setPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let cur = obj;
  keys.slice(0, -1).forEach((k) => {
    if (!cur[k] || typeof cur[k] !== 'object') cur[k] = {};
    cur = cur[k] as Record<string, unknown>;
  });
  const last = keys[keys.length - 1];
  if (value === undefined || value === '') delete cur[last];
  else cur[last] = value;
}
