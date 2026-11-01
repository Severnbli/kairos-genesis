import type { Field } from '../core/schema';
import type { ThemeTokens } from '../core/types';

/** Story-wide settings, grouped for the "Story" page of the admin. Keys are paths on story.json. */
export const storyGroups: { title: string; fields: Field[] }[] = [
  {
    title: 'Basics',
    fields: [
      { key: 'meta.title', label: 'Page title', kind: 'text' },
      { key: 'meta.description', label: 'Description', kind: 'text', help: 'Shown in link previews.' },
      { key: 'meta.lang', label: 'Language', kind: 'text', help: 'BCP 47 code, e.g. en, ru, uk. Used for date formatting.' },
      { key: 'meta.storageKey', label: 'Storage key', kind: 'text', help: 'Answers are saved in the browser under this key. Change it to start everyone fresh.' },
      { key: 'labels.next', label: '"Next" button label (screen readers)', kind: 'text' },
      { key: 'labels.back', label: '"Back" button label (screen readers)', kind: 'text' },
    ],
  },
  {
    title: 'Theme',
    fields: [
      { key: 'theme.bg', label: 'Background', kind: 'color' },
      { key: 'theme.bgElevated', label: 'Cards & inputs', kind: 'color' },
      { key: 'theme.text', label: 'Text', kind: 'color' },
      { key: 'theme.textMuted', label: 'Muted text', kind: 'color' },
      { key: 'theme.accent', label: 'Accent', kind: 'color' },
      { key: 'theme.accentSoft', label: 'Second accent (glow)', kind: 'color' },
      { key: 'theme.border', label: 'Borders', kind: 'color' },
      { key: 'theme.radius', label: 'Corner radius', kind: 'text', placeholder: '14px' },
      { key: 'theme.fontDisplay', label: 'Display font (CSS font-family)', kind: 'text', placeholder: "'EB Garamond', serif" },
      { key: 'theme.fontBody', label: 'Body font (CSS font-family)', kind: 'text', placeholder: "'Inter', sans-serif" },
      { key: 'meta.fontsUrl', label: 'Google Fonts URL', kind: 'text', help: 'Must load the fonts named above (fonts.google.com → Get embed code → the href).' },
    ],
  },
  {
    title: 'Atmosphere',
    fields: [
      { key: 'ambient.particles', label: 'Floating particles', kind: 'boolean' },
      { key: 'ambient.density', label: 'Particle density', kind: 'number', min: 0, max: 5, step: 0.1 },
    ],
  },
  {
    title: 'Getting the answers back',
    fields: [
      { key: 'submit.endpoint', label: 'POST endpoint', kind: 'text', placeholder: 'https://formspree.io/f/…', help: 'Answers are POSTed as JSON. Formspree, a Cloudflare Worker or a Google Apps Script all work.' },
      { key: 'submit.telegram', label: 'Telegram username', kind: 'text', help: 'Without @. The recap is copied, then your chat opens.' },
      { key: 'submit.whatsapp', label: 'WhatsApp number', kind: 'text', help: 'International format, digits only.' },
      { key: 'submit.email', label: 'Email', kind: 'text' },
      { key: 'submit.share', label: 'Copy / native share button', kind: 'boolean' },
    ],
  },
];

export const themePresets: { name: string; theme: Partial<ThemeTokens> }[] = [
  {
    name: 'Candlelight',
    theme: { bg: '#0f0d14', bgElevated: '#1a1621', text: '#efe8dc', textMuted: '#a69c8e', accent: '#d9b98c', accentSoft: '#c98b8b', border: '#2e2836' },
  },
  {
    name: 'Midnight blue',
    theme: { bg: '#0b1020', bgElevated: '#141b31', text: '#e6ebf5', textMuted: '#8d97b0', accent: '#9fb8ff', accentSoft: '#7c5cbf', border: '#252e4a' },
  },
  {
    name: 'Rose dawn',
    theme: { bg: '#1a0f12', bgElevated: '#26161b', text: '#f6e7e4', textMuted: '#b8999a', accent: '#f2a7a0', accentSoft: '#e0b06f', border: '#3a252b' },
  },
  {
    name: 'Forest',
    theme: { bg: '#0d1410', bgElevated: '#152019', text: '#e7efe6', textMuted: '#93a596', accent: '#c7d59f', accentSoft: '#6fa38a', border: '#243329' },
  },
  {
    name: 'Paper (light)',
    theme: { bg: '#f6f1e9', bgElevated: '#fffaf2', text: '#2a2420', textMuted: '#7a6e64', accent: '#a0522d', accentSoft: '#d9a5a0', border: '#e2d8ca' },
  },
];
