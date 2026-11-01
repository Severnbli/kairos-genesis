import type { Answers, RecapItem, StoryConfig } from './types';


export function recapText(recap: RecapItem[], heading: string): string {
  return [heading, '', ...recap.map((r) => `• ${r.title}: ${r.value}`)].join('\n');
}

/** POST answers as JSON to `submit.endpoint`. Resolves to true on a 2xx response. */
export async function postAnswers(endpoint: string, story: StoryConfig, answers: Answers, recap: RecapItem[]): Promise<boolean> {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ story: story.meta.title, sentAt: new Date().toISOString(), answers, recap }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export interface ShareLink {
  label: string;
  href: string;
  /** Copy the recap to the clipboard before opening (for chats that cannot be prefilled). */
  copyFirst?: boolean;
}

/** Deep links that open a messenger with the recap prefilled (or copied, for Telegram). */
export function shareLinks(story: StoryConfig, text: string): ShareLink[] {
  const s = story.submit;
  const enc = encodeURIComponent(text);
  const links: ShareLink[] = [];
  // Telegram cannot prefill a message to a specific user: copy the recap, then open the chat.
  if (s.telegram) links.push({ label: 'Telegram', href: `https://t.me/${s.telegram.replace(/^@/, '')}`, copyFirst: true });
  if (s.whatsapp) links.push({ label: 'WhatsApp', href: `https://wa.me/${s.whatsapp.replace(/\D/g, '')}?text=${enc}` });
  if (s.email) links.push({ label: 'Email', href: `mailto:${s.email}?subject=${encodeURIComponent(story.meta.title)}&body=${enc}` });
  return links;
}
