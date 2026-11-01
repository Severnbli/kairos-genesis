import { startAmbient } from './core/ambient';
import { createStory } from './core/engine';
import { DRAFT_KEY } from './core/preview';
import { applyTheme, loadFonts } from './core/theme';
import type { StoryConfig } from './core/types';
import storyJson from './story.json';
import './styles/tokens.css';
import './styles/base.css';
import './styles/forms.css';
import './styles/custom.css';

const params = new URLSearchParams(location.search);
const preview = import.meta.env.DEV && params.has('preview');

function loadStory(): StoryConfig {
  if (preview) {
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) return JSON.parse(draft) as StoryConfig;
    } catch {
      /* fall back to the saved story */
    }
  }
  return storyJson as unknown as StoryConfig;
}

const story = loadStory();
document.title = story.meta.title;
document.documentElement.lang = story.meta.lang ?? 'en';
if (story.meta.description) document.querySelector('meta[name="description"]')?.setAttribute('content', story.meta.description);
applyTheme(story.theme ?? {});
loadFonts(story.meta.fontsUrl);
if (story.ambient?.particles) startAmbient(story.ambient.density);

// Dev and preview: `?step=5` or `#5` opens step 5 directly (1-based, ignores gating).
const requested = Number(params.get('step') ?? (import.meta.env.DEV ? location.hash.slice(1) : '')) - 1;

createStory(document.getElementById('app')!, story, {
  storageKey: preview ? `${story.meta.storageKey}:preview` : undefined,
  startAt: Number.isFinite(requested) && requested > 0 ? requested : 0,
  onStep: (i) => {
    if (import.meta.env.DEV && !preview) history.replaceState(null, '', `#${i + 1}`);
  },
});

if (preview) {
  // The admin bumps this key whenever the draft changes: reload to show it.
  window.addEventListener('storage', (e) => {
    if (e.key === DRAFT_KEY) location.reload();
  });
}

// Dev: reload open tabs when the admin saves story.json (the admin itself is not reloaded).
import.meta.hot?.on('kairos:story-saved', () => {
  if (!preview) location.reload();
});
