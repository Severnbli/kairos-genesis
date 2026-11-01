import type { StoryConfig } from '../core/types';

/** Client for the dev-only endpoints defined in vite.config.ts (`adminApi`). */
async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/__admin${path}`, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? res.statusText);
  return body as T;
}

export const api = {
  load: () => call<StoryConfig>('/story'),
  save: (story: StoryConfig) =>
    call<{ ok: true }>('/story', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(story) }),
  media: () => call<string[]>('/media'),
  upload: (file: File) => call<{ url: string }>(`/media?name=${encodeURIComponent(file.name)}`, { method: 'POST', body: file }),
};
