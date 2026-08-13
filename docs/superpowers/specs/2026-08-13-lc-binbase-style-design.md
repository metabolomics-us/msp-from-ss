# Visual Redesign: LC-BinBase-style Navbar & Cards

Date: 2026-08-13
Status: Approved

## Context

The user asked to restyle this app's single page to visually match the look
of another lab tool in the same suite ("LC-BinBase Control Panel" — a navy
navbar with a gold accent, white cards). Scope was explicitly narrowed
through brainstorming to **visual style only**: no new navigation, no new
features, no dark/light theme toggle for this pass. Developed iteratively
against a live dev server (`ng serve` on port 4300) with headless-Chrome
screenshots reviewed at each step, since the interactive browser extension
wasn't available.

## Goals

- Navy/gold navbar carrying the app name and a badge listing supported file
  formats (a content-derived echo of the reference's environment badge).
- Restructure the existing single-page content (instructions, example
  files, upload form) into white bordered cards with icon+title headers.
- Restyle the Browse/Submit buttons and the file-name status line to match.
- Preserve every existing behavior, DOM id, and `name` attribute the test
  suite (and the currently-inert e2e suite) depends on.

## Non-goals

- No dark/light theme toggle (explicitly deferred by the user for this pass,
  despite the global CLAUDE.md default — noted, not silently overridden).
- No navigation menu, search bar, or other reference-page features that
  don't correspond to anything this single-page app actually does.
- No change to `BuildMspService`/`ReadSpreadsheetService` business logic.

## What was built

- `src/assets/styles/dashboard-theme.css` (new) — navy/gold navbar, card,
  and button styling, scoped under `.app-navbar`/`.rs-page` so it can't
  bleed into or be overridden by the pre-existing vendored Bootstrap
  3/FontAwesome 4 styles. Imported last in `src/styles.css` so it wins
  cascade ties over the legacy stylesheets.
- `src/app/app.component.html` — added the `<header class="app-navbar">`
  bar (brand name + file-format badge).
- `src/app/read-spreadsheet/read-spreadsheet.component.html` — restructured
  into three `.rs-card` sections (`#instructions`, `#examples`, and an
  unlabeled upload card), keeping every existing `id` (`file-input`,
  `submit`, `file-name-text`, `correct-image`, `wrong-image`, `error-box`,
  `error-text`, `error-file`, `get-error-file`, `more-info`, `added-notes`,
  `notes-area`, `show-notes-button`, `rs-buttons`) and `name` attribute
  (`example_spreadsheet_large-xlsx`, `example_spreadsheet_small-xlsx`,
  `example_msp-txt`) unchanged. Removed the page title/subtitle block per
  user feedback (redundant with the navbar brand) and the old decorative
  `.fade-effect` gradient divider (superseded by card borders).
- The idle file-name status line (`#file-name-text`) is now hidden via
  `[hidden]="!showCorrect && !showWrong"` until a real result exists,
  instead of always showing the "Click 'Browse'..." placeholder — a
  template-only change using the component's existing bound properties,
  no `.ts` logic touched.

## Bugs found and fixed along the way

Two latent bugs surfaced while building this, both fixed as part of this
change since leaving them would have undermined the redesign's own icons:

1. **Icon class mismatch.** The vendored icon stylesheet
   (`h5p-font-awesome.min.css`) is genuinely Font Awesome **4** (a custom
   `H5PFontAwesome4` font family, base class `.fa`), but every icon in this
   app — including code that predates this redesign (Browse/Submit/
   thumbs-up/times-circle icons) — used the Font Awesome 5 `fas` prefix,
   which doesn't exist in that stylesheet. Icons were silently rendering as
   nothing. Fixed by changing every `fas` to `fa` in
   `read-spreadsheet.component.html`.
2. **`[hidden]` silently defeated on icon elements.** Fixing bug #1 exposed
   a second one: FA4's `.fa` class sets `display: inline-block` as a normal
   (non-`!important`) author rule, which beats the browser's default
   `[hidden] { display: none }` user-agent rule regardless of specificity
   ties (author-origin rules always beat user-agent-origin rules at equal
   specificity). This made the correct/wrong status icons and the notes
   plus/minus icons stay visible regardless of their `[hidden]` binding.
   Fixed with a scoped `.rs-page .fa[hidden] { display: none !important; }`
   override.

## Testing

No new test cases — this is a visual/template restructuring with zero
business-logic change. The existing 5 spec files (`36` specs, `35`
executed, 1 permanently skipped) are the regression contract; they were
re-run after every change during development and stayed green throughout,
confirming every DOM id/name the suite depends on survived the
restructuring.

## Follow-ups (not in this change)

- Dark/light theme toggle, deferred per the user's explicit choice for this
  pass — worth revisiting given the global CLAUDE.md default.
- The `fas`→`fa` icon-class bug and the `[hidden]`-vs-FA4 interaction were
  fixed narrowly for the icons this redesign touches; a full audit of any
  other Font Awesome usage elsewhere in the app is out of scope here.
