import type { ThemeTokens } from './types';

const cssVar: Record<keyof ThemeTokens, string> = {
  bg: '--kg-bg',
  bgElevated: '--kg-bg-elevated',
  text: '--kg-text',
  textMuted: '--kg-text-muted',
  accent: '--kg-accent',
  accentSoft: '--kg-accent-soft',
  border: '--kg-border',
  fontDisplay: '--kg-font-display',
  fontBody: '--kg-font-body',
  radius: '--kg-radius',
};

/** Theme tokens from story.json override the defaults in styles/tokens.css. */
export function applyTheme(theme: Partial<ThemeTokens>, target: HTMLElement = document.documentElement): void {
  for (const [key, value] of Object.entries(theme)) {
    const name = cssVar[key as keyof ThemeTokens];
    if (name && value) target.style.setProperty(name, value);
  }
}

export function loadFonts(url?: string): void {
  if (!url || document.querySelector(`link[data-fonts]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  link.dataset.fonts = '';
  document.head.append(link);
}
