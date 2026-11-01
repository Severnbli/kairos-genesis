# Kairos-Genesis (Καιρός – Γένεσις)

> *Some moments are meant to become beginnings.*

A small, personal website for inviting someone on a date – the first one or the fiftieth.

You send a link. They walk through a few elegant steps (*is it a date? where should we go? which evening? anything I should know?*) and send the answers back to you as a ready plan.

You personalize everything in a built-in editor with a live phone preview. No code needed.

![Admin editor with live phone preview](docs/screenshot.png)

## How it works

```
  you, locally                          your server / static host            them, on a phone
┌──────────────────────────┐  build   ┌──────────────────────────┐   link   ┌──────────────────┐
│ admin (/admin.html)      │ ───────► │ static site (dist/ or    │ ───────► │ walks the steps, │
│ edits src/story.json     │          │ Docker image), no admin  │          │ sends the plan   │
└──────────────────────────┘          └──────────────────────────┘          └──────────────────┘
```

- **The whole story is one file:** `src/story.json` – names, texts, colors, steps, where answers go.
- **The admin only runs on your machine** (the dev server). It edits `story.json` and uploads images to `public/media/`.
- **The published site is static.** The story is baked in at build time, the admin is not included, and nobody can change anything through it. After editing, you rebuild and redeploy.

## Make your own

### 1. Get a private copy

Your story is personal, so don't fork it publicly: use **Use this template → Private repository** on GitHub, then clone it.

### 2. Start the editor

With Docker:

```bash
docker compose up dev
```

Or with Node 24+:

```bash
npm install
npm run dev
```

Open **http://localhost:5173/admin.html** (the site itself is on http://localhost:5173).

### 3. Edit the story

- **Story settings:** names (`{recipient}`, `{author}`, any other placeholders), theme colors or a preset, fonts, particles.
- **Steps:** add, reorder (drag), duplicate, delete. Every field is editable, including *show only if…* conditions and per-step appearance (background image, accent color, CSS class).
- **Getting the answers back:** choose at least one channel (see [below](#getting-the-answers-back)), or you'll never see the plan.

The preview on the right updates as you type. **Save** (`Ctrl+S`) writes `src/story.json`.

### 4. Check it

Click through the whole story in the preview at phone size: required steps block "next", conditional steps appear when they should, and the final recap reads right. Then send the result to yourself once.

### 5. Publish and send the link

Commit, then deploy (see [Deploying](#deploying)). Every later edit means: save in the admin → commit → rebuild/redeploy.

## Deploying

**Any static host** (Netlify, Cloudflare Pages, Vercel, your own nginx):

```bash
npm run build    # → dist/
```

Upload `dist/`. Paths are relative, so it works from any sub-path.

**Docker on your own server:**

```bash
docker compose up -d --build site    # http://localhost:8080
```

**Prebuilt image from CI:** `.github/workflows/docker.yml` builds a multi-arch image (amd64, arm64) and pushes it to Docker Hub – `:latest` from `main`, `:dev` from `dev`, `:1.2.3` from `v1.2.3` tags. It needs the repo secrets `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`; in a fork, change `IMAGE` in the workflow to your own repository. Then on the server:

```bash
docker run -d -p 8080:80 --restart unless-stopped <you>/kairos-genesis:latest
```

### Privacy

- The page sends `noindex`, so search engines skip it, but **anyone with the link can open it**.
- A Docker image contains your whole story: make the Docker Hub repository private.
- A fork of a public repository is public too – hence the private template copy in step 1.

## Reference

### Step types

| Type | What it does | Stores |
| --- | --- | --- |
| `intro` | Opening screen with a big title and a begin button | – |
| `message` | A letter or a quote; can show earlier answers (`{place}`) | – |
| `choice` | Pick one or several options: cards, grid or list, emoji or images, custom answer | `string` / `string[]` |
| `scale` | A slider with a word per value | `number` |
| `text` | Free text, short or multi-line | `string` |
| `date` | Offered days (or a free picker) plus times | `"YYYY-MM-DD[THH:MM]"` |
| `confirm` | Yes / no, the "no" can playfully run away | `boolean` |
| `summary` | Recap of all answers and ways to send them back | – |

### Placeholders

Any text can use `{name}`:

- `{recipient}`, `{author}` and other variables from **Story settings**.
- `{<step id>}` – the readable answer to that step, e.g. `{place}` or `{when}`.

### Conditions

A step with `when` is shown only if all of its conditions hold. Hidden steps are skipped and left out of the recap:

```json
{ "type": "choice", "id": "cuisine", "when": [{ "id": "place", "op": "equals", "value": "dinner" }] }
```

Operators: `equals`, `notEquals`, `includes`, `excludes`, `answered`, `gte`, `lte`.

### Getting the answers back

Set under **Story settings → Getting the answers back** (`submit` in `story.json`). Any combination works:

| Channel | What happens on their side |
| --- | --- |
| **POST endpoint** | Answers are sent as JSON to e.g. [Formspree](https://formspree.io), a Cloudflare Worker or a Google Apps Script |
| **Telegram** | The recap is copied to the clipboard and your chat opens (Telegram can't prefill) |
| **WhatsApp / email** | Opens with the recap prefilled |
| **Copy / share** | Native share sheet on phones, clipboard elsewhere |

### Commands

```bash
npm run dev            # site on :5173, admin on :5173/admin.html
npm run build          # typecheck + static build into dist/ (admin excluded)
npm run typecheck
docker compose up dev  # same as npm run dev, your files mounted into the container
docker compose up site # production build behind nginx on :8080
```

### Adding a new step type

Create `src/steps/<name>/index.ts` (+ `style.css`), export a `defineStep({...})` with `label`, `description`, `fields`, `create` and `mount`, and register it in `src/steps/index.ts`. The admin builds the editor for it from `fields`. See [CLAUDE.md](CLAUDE.md) for details.

## The name

- **Kairos (καιρός)** – the opportune moment, when circumstances align and something meaningful happens.
- **Genesis (γένεσις)** – origin, birth, the beginning of something new.

Together: *the birth of something meaningful at the right moment.* Every date can be that moment. The site should feel sincere, warm, elegant and a little mysterious – a small world made for one particular person, not a landing page or a survey.

## License

[MIT](LICENSE)
