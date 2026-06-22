# CLAUDE.md

Guidance for AI assistants (Claude Code and others) working in this repository.

## What this project is

A **static, client-side pathology quiz website** for nursing students at 仁德醫專
(Jen-Teh Junior College) — course 解剖生理病理學 III (Anatomy, Physiology &
Pathology III), chapters 10–19. It is published via **GitHub Pages** at
<https://tsn4830-ui.github.io/pathology-quiz/> and contains 328 Chinese-language
multiple-choice questions with detailed explanations, organized by body system.

All content (UI labels, questions, answers, explanations) is in **Traditional
Chinese (zh-TW)**. Preserve this — never translate existing content to English or
Simplified Chinese unless explicitly asked.

## Architecture: pure static, zero-dependency, single-file-per-chapter

There is **no build step, no framework, no package manager, no backend, no
database**. Each page is a self-contained `.html` file with inline `<style>` and
inline `<script>`. A browser opens them directly; GitHub Pages serves them as-is.

- **No `npm`, no `node_modules`, no bundler, no transpiler.** Do not introduce
  any of these. Do not add external CDN dependencies or web fonts — the site is
  designed to work fully offline.
- **No JS framework** (no React/Vue/etc.). Plain vanilla DOM JavaScript only.
- To preview locally, just open `index.html` in a browser, or run a static
  server from the repo root, e.g. `python3 -m http.server` and visit
  `http://localhost:8000/`.

### File layout

```
pathology-quiz/
├── index.html              # Landing page / chapter navigation hub
├── cardio_quiz.html        # Ch 10 心臟血管 (cardiovascular)   — 35 Q
├── ch11_hema_quiz.html     # Ch 11 造血淋巴 (hematolymphatic)  — 39 Q
├── ch12_resp_quiz.html     # Ch 12 呼吸     (respiratory)      — 28 Q
├── ch13_gi_quiz.html       # Ch 13 消化     (GI)               — 37 Q
├── ch14_liver_quiz.html    # Ch 14 肝膽胰   (liver/biliary)    — 31 Q
├── ch15_renal_quiz.html    # Ch 15 泌尿     (renal)            — 30 Q
├── ch16_repro_quiz.html    # Ch 16 生殖     (reproductive)     — 55 Q (largest)
├── ch17_endo_quiz.html     # Ch 17 內分泌   (endocrine)        — 30 Q
├── ch18_neuro_quiz.html    # Ch 18 神經     (neuro)            — 15 Q (smallest)
├── ch19_bone_quiz.html     # Ch 19 骨骼關節 (bone/joint)       — 28 Q
├── README.md               # User-facing docs (Chinese)
├── pathology.zip           # Downloadable offline bundle of the site
└── CLAUDE.md               # This file
```

Note: chapter 10's file is named `cardio_quiz.html` (not `ch10_…`) for historical
reasons — keep this name so existing links don't break. All other chapters use the
`chNN_<system>_quiz.html` convention.

## How a quiz page works

Every chapter file is structurally identical — only the content, the chapter
title, and the accent color differ. Each one has two modes selected by tabs:

1. **測驗模式 (Quiz mode)** — sequential or shuffled MCQs, instant
   correct/wrong feedback, per-question explanation, a live score, and an
   end-of-quiz results screen with a full answer review.
2. **🃏 閃卡記憶 (Flashcards)** — flip cards (question → answer + explanation),
   prev/next navigation, shuffle, and progress dots.

### The question data model

All questions live in a single JS array literal named `Q` inside the page's
`<script>`. Each entry is:

```js
{
  q:    "問題文字？",                       // question text
  opts: ["選項A", "選項B", "選項C", "選項D"], // exactly 4 options
  ans:  0,                                  // 0-based index of correct option
  exp:  "詳細解析…"                          // explanation shown after answering
}
```

Conventions to follow when editing `Q`:
- **Exactly four options** per question; `K=["A","B","C","D"]` maps index → letter.
- `ans` is a **0-based** index (0 = A, 3 = D). Double-check off-by-one.
- `exp` should give the reasoning, mechanism, timing/sequence, or differential —
  matching the existing pedagogical, detailed style.
- The question count in the page is whatever `Q.length` is. If you add or remove
  questions, also update the count shown in the page **header** (`.subtitle`),
  the progress/total labels, the **results screen total**, `index.html`'s
  chapter card count, and the totals/badges in `README.md`.

### Key JS functions (same names across all quiz files)

- `startQuiz(shuffle)` — begins quiz; `shuffle=true` randomizes order.
- `renderQ()` / `pickOpt(i)` / `nextQ()` — render a question, handle a choice,
  advance. `pickOpt` locks the answer (no changing once chosen).
- `showResult()` — computes percentage, grade band, and the review list.
- Flashcards: `renderFC()`, `flipCard()`, `navFC(dir)`, `shuffleFC()`,
  `renderDots()`.

State is held in module-level `let` variables (`order`, `idx`, `chosen`, `log`,
`fcOrder`, `fcIdx`, `flipped`, `fcSeen`). There is no persistence — reloading the
page resets everything (this is intentional; no `localStorage`/cookies, no
tracking).

## Styling conventions

- A dark theme defined with CSS custom properties in `:root` (e.g. `--bg`,
  `--card`, `--text`, `--muted`, `--green`, `--gold`). Reuse these variables
  rather than hard-coding colors.
- Each chapter has a **distinct accent color** (set via `--accent` / `--red`)
  so chapters are visually distinguishable. The accents used in `index.html`
  cards must stay in sync with each chapter page's own theme:
  - 10 `#e84a5f` · 11 `#9b59b6` · 12 `#4dc4d6` · 13 `#e8a04a` · 14 `#d4a04a`
  - 15 `#5dade2` · 16 `#e85a9c` · 17 `#a78bfa` · 18 `#5fb4d4` · 19 `#d4b896`
- Layout is responsive (works on phone/tablet/desktop) and uses system fonts
  (`PingFang TC`, `Noto Sans TC`) — no web-font downloads.
- All CSS/JS is **inline** in each HTML file. Keep it that way; do not extract
  shared stylesheets or scripts (it would break the offline single-file design).

## Common tasks

- **Add/edit/fix a question** → edit the `Q` array in the relevant chapter file.
  Verify `ans` points to the correct option. Update counts if the total changed
  (see list above).
- **Add a whole new chapter** → copy an existing `chNN_*_quiz.html`, replace the
  header title/subtitle, pick a new accent color, replace the `Q` array, then add
  a matching `<a class="chapter-card">` to `index.html` and a row to `README.md`.
- **Fix a reported error** — content corrections (issues from students) are the
  most common change. Keep edits minimal and in Traditional Chinese.

## Verifying changes

Since there are no tests, verify manually:
1. Open the edited file in a browser (or via `python3 -m http.server`).
2. Run through Quiz mode: confirm the correct answer highlights green, wrong
   choices red, explanations appear, the score updates, and the results screen
   totals are right.
3. Check Flashcards mode flips and navigates.
4. Confirm the `index.html` card links to the page and the count matches.

A quick sanity check that question objects are well-formed:
`grep -c '{q:' <file>.html` should equal the count shown on the page.

## Git workflow

- Active development branch for this task: **`claude/claude-md-docs-646slx`**.
  Develop, commit, and push there. Do not push to `main` without explicit
  permission, and do not open a PR unless asked.
- This repo's history shows content is sometimes uploaded via GitHub's web UI
  ("Add files via upload" commits). There is currently **no CI workflow** (a
  previous Jekyll Actions workflow was removed); GitHub Pages serves the static
  files directly.

## Things to avoid

- Don't add build tooling, dependencies, frameworks, or external/CDN assets.
- Don't split the inline CSS/JS into separate files.
- Don't translate or alter the Chinese content's meaning when not asked.
- Don't rename `cardio_quiz.html`.
- Don't add analytics, tracking, login, or anything requiring a backend.
- This is **educational content only** — explanations are study aids, not
  clinical guidance.
