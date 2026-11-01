import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { basename, extname, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const STORY_PATH = resolve(__dirname, 'src/story.json');
const MEDIA_DIR = resolve(__dirname, 'public/media');
const MEDIA_TYPES = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.svg', '.mp3', '.mp4', '.webm']);
const MAX_UPLOAD = 25 * 1024 * 1024;

/**
 * Dev-only API used by admin.html. It exists only while `vite` (dev server) runs and is never
 * part of the production build, so the deployed site has no admin and no write access.
 *   GET  /__admin/story          current src/story.json
 *   PUT  /__admin/story          overwrite src/story.json (pretty-printed)
 *   GET  /__admin/media          list files in public/media
 *   POST /__admin/media?name=x   upload a file to public/media
 */
function adminApi(): Plugin {
  return {
    name: 'kairos-admin-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__admin', async (req, res) => {
        try {
          const url = new URL(req.url ?? '/', 'http://local');
          if (url.pathname === '/story' && req.method === 'GET') {
            return send(res, 200, await readFile(STORY_PATH, 'utf8'));
          }
          if (url.pathname === '/story' && req.method === 'PUT') {
            const story = JSON.parse((await readBody(req, 2 * 1024 * 1024)).toString('utf8'));
            if (!story || !Array.isArray(story.steps) || !story.meta) throw new Error('Not a story: needs meta and steps');
            await writeFile(STORY_PATH, `${JSON.stringify(story, null, 2)}\n`);
            return send(res, 200, JSON.stringify({ ok: true }));
          }
          if (url.pathname === '/media' && req.method === 'GET') {
            await mkdir(MEDIA_DIR, { recursive: true });
            const files = (await readdir(MEDIA_DIR)).filter((f) => MEDIA_TYPES.has(extname(f).toLowerCase()));
            return send(res, 200, JSON.stringify(files.map((f) => `media/${f}`)));
          }
          if (url.pathname === '/media' && req.method === 'POST') {
            const raw = basename(url.searchParams.get('name') ?? '');
            const ext = extname(raw).toLowerCase();
            if (!MEDIA_TYPES.has(ext)) throw new Error(`Unsupported file type: ${ext || 'none'}`);
            const name = `${raw.slice(0, -ext.length).toLowerCase().replace(/[^a-z0-9-_]+/g, '-').slice(0, 60) || 'file'}${ext}`;
            await mkdir(MEDIA_DIR, { recursive: true });
            await writeFile(resolve(MEDIA_DIR, name), await readBody(req, MAX_UPLOAD));
            return send(res, 200, JSON.stringify({ url: `media/${name}` }));
          }
          send(res, 404, JSON.stringify({ error: 'Not found' }));
        } catch (err) {
          send(res, 400, JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
        }
      });
    },
  };
}

function readBody(req: IncomingMessage, limit: number): Promise<Buffer> {
  return new Promise((ok, fail) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        fail(new Error('Body too large'));
        req.destroy();
      } else chunks.push(chunk);
    });
    req.on('end', () => ok(Buffer.concat(chunks)));
    req.on('error', fail);
  });
}

function send(res: ServerResponse, status: number, body: string): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(body);
}

export default defineConfig({
  // Relative asset paths: the build works from any sub-path (GitHub Pages, nginx, a USB stick).
  base: './',
  plugins: [adminApi()],
  server: {
    // Saving the story should not reload the admin itself; the preview reloads on its own.
    watch: { ignored: ['**/public/media/**'] },
  },
  build: {
    // Only the site is built. admin.html is dev-only on purpose.
    rollupOptions: { input: resolve(__dirname, 'index.html') },
  },
});
