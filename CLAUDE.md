# Kairos-Genesis

A personal, modular website for a first date. The recipient walks through a sequence of form steps (is it a date, where to go, which evening, anything to know) and sends the answers back as a plan. This repo is a **base meant to be forked** and personalized, mostly through the admin, without touching code.

## Spirit (applies to every change)

- *Some moments are meant to become beginnings.* The site should feel sincere, curious, elegant, warm, with a subtle sense of mystery. A small personal world, never a generic landing page or a survey tool.
- Prefer restraint: quiet motion, generous spacing, serif display type, one accent color. Every new step type should look like it belongs to the same world.
- Mobile first: the link is almost always opened on a phone. Test at 390×844.
- Respect `prefers-reduced-motion`.
- Default copy uses no pronouns for the recipient and refers to them through `{recipient}`. Keep it that way in the base; forks personalize it.

## Writing style

- Never use the em dash. Use the en dash (–) everywhere: UI copy, `story.json`, code comments, docs, commit messages.

## Commands

```bash
npm run dev          # site on :5173, admin on :5173/admin.html
npm run build        # typecheck + static build into dist/ (admin excluded)
npm run typecheck
docker compose up dev    # same as npm run dev, source bind-mounted
docker compose up site   # production build behind nginx on :8080
```

Work on the `dev` branch; `main` deploys to GitHub Pages.

CI (`.github/workflows/`): `pages.yml` deploys `main` to GitHub Pages; `docker.yml` pushes the `prod` image to Docker Hub as `severnbli/kairos-genesis` (`:latest` from main, `:dev` from dev, semver from `v*` tags; secrets `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`). The deps/build stages use `--platform=$BUILDPLATFORM` on purpose: only the nginx stage is per-arch.

## Architecture

```
index.html, src/main.ts      site entry: loads story.json (or the admin draft in preview), theme, particles, engine
admin.html, src/admin/       dev-only editor (never built for production)
src/story.json               THE content: meta, vars, theme, ambient, submit, labels, steps[]
src/core/
  types.ts                   StoryConfig, BaseStep, StepModule, StepContext, Condition
  engine.ts                  mounts all steps once, shows one at a time, nav, gating, conditions, recap, {placeholders}
  schema.ts                  Field descriptors that step types declare; the admin renders forms from them
  conditions.ts              `when` evaluation (equals, includes, gte…)
  store.ts                   answers in memory + localStorage under `${storageKey}:answers`
  dom.ts                     h() hyperscript helper, reveal() stagger, stepHeader()
  theme.ts, ambient.ts       CSS variable overrides, particle canvas
  submit.ts                  POST endpoint, messenger deep links, recap text
  preview.ts                 DRAFT_KEY shared by the admin and the preview iframe
src/steps/<type>/            one folder per step type: index.ts + style.css
src/steps/index.ts           registry: type name → module
src/styles/                  tokens.css (defaults), base.css (stage, nav, reveal), forms.css (btn, chip, field), custom.css (fork overrides)
vite.config.ts               dev-only admin API: GET/PUT /__admin/story, GET/POST /__admin/media
public/media/                images uploaded through the admin
```

### Key rules

- **`story.json` must stay pure JSON.** No functions anywhere in the config. That is what makes the admin possible. Logic goes into step modules; behavior is selected by data (`variant`, `layout`, `when` conditions…).
- **All steps mount once at boot.** Dynamic text (anything that reads other answers) must re-render in the `enter()` hook, as `message` and `summary` do.
- **Gating:** a step is `required` by its type default (`requiredByDefault`) unless the config overrides it. Required steps call `ctx.setComplete(valid)` whenever their answer changes, including on mount for restored answers.
- **Answers** are keyed by the step's `id`. Steps that collect answers set `collects: true`, which makes the admin ask for an id and validate it.
- `summarize(config, value)` turns a stored answer into readable text. It is used by the recap and by `{id}` placeholders.
- The admin and its API must never reach the production build. `vite.config.ts` builds only `index.html`, the API plugin uses `apply: 'serve'`, and preview mode is guarded by `import.meta.env.DEV`.
- Theme values come from `story.json → theme` and override `src/styles/tokens.css` as `--kg-*` CSS variables. Use the tokens in CSS, never hard-coded colors.
- Shared visual primitives (`.btn`, `.chip`, `.field`, `.reveal`, `.step-header`) live in `src/styles`. Reuse them before adding new ones.
- Vanilla TypeScript with no UI framework and no runtime dependencies. Keep the bundle small.

### Adding a step type

1. Create `src/steps/<name>/index.ts` and `style.css` (prefix classes with the type name: `.name__part`).
2. Export `defineStep<YourConfig>({ label, description, fields, create, mount, summarize?, collects?, requiredByDefault?, hideNav? })`.
   - `fields`: what the admin edits. Kinds: `text`, `textarea`, `number`, `boolean`, `color`, `image`, `select`, `lines` (string[]), `list` (array of objects with sub-fields).
   - `create()`: sensible default content for a freshly added step.
   - `mount(el, config, ctx)`: build DOM with `h()`, wrap entering elements with `reveal()`, read and write answers through `ctx.answers`, run every user-facing string through `ctx.fill()`.
3. Register it in `src/steps/index.ts`. The admin picks it up automatically.
4. Add a sample to `src/story.json` only if it is broadly useful for forks.

### Common fork tasks

- Content, names, colors, fonts, send channels: use the admin. Avoid hand-editing `story.json` unless asked.
- One-off styling: set `appearance.className` on a step in the admin, then style it in `src/styles/custom.css`.
- Images: upload in the admin (saved to `public/media/`) and reference them as `media/<file>`.

## Verifying changes

- `npm run build` must pass (it runs `tsc --noEmit` first).
- Walk through the whole story at phone size: required steps lock "next", conditional steps appear and disappear correctly, and the summary recap is right.
- Open the admin, edit a field, and check that the preview updates and that Save writes `src/story.json`.
- Check that `dist/` contains no admin code (`grep -r __admin dist` finds nothing).
