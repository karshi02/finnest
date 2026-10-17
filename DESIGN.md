---
name: FitTrack Pro
description: Night-gym set logger for Thai students; graphite floor, chalk text, one bumper-plate yellow.
colors:
  bumper-yellow: "#f2c230"
  bumper-yellow-hover: "#ffd24a"
  plate-ink: "#16181b"
  rubber-floor: "#121416"
  bench-graphite: "#1a1d21"
  raised-graphite: "#23272c"
  pressed-graphite: "#2c3137"
  hairline: "#2f343a"
  steel-edge: "#6a7179"
  chalk: "#edebe6"
  chalk-muted: "#a9adb3"
  miss-coral: "#ff7a6b"
  pass-green: "#3dbe6b"
  signal-blue: "#6fb1ff"
  caution-amber: "#ffb86b"
  plate-25-red: "#d6403a"
  plate-20-blue: "#2f6fd1"
  plate-15-yellow: "#f2c230"
  plate-10-green: "#3ba55c"
  plate-5-white: "#e8e6e1"
  plate-change-grey: "#9aa0a6"
typography:
  display:
    fontFamily: "Anuphan, Noto Sans Thai, Leelawadee UI, Tahoma, system-ui, sans-serif"
    fontSize: "4.25rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Anuphan, Noto Sans Thai, Leelawadee UI, Tahoma, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  figure:
    fontFamily: "Anuphan, Noto Sans Thai, Leelawadee UI, Tahoma, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 600
    lineHeight: 1.3
    fontFeature: "tnum"
  title:
    fontFamily: "Anuphan, Noto Sans Thai, Leelawadee UI, Tahoma, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Anuphan, Noto Sans Thai, Leelawadee UI, Tahoma, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    fontFeature: "tnum"
  label:
    fontFamily: "Anuphan, Noto Sans Thai, Leelawadee UI, Tahoma, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.6
  caption:
    fontFamily: "Anuphan, Noto Sans Thai, Leelawadee UI, Tahoma, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.6
rounded:
  tag: "6px"
  sm: "8px"
  md: "10px"
  card: "12px"
  lg: "14px"
  sheet: "18px"
  pill: "999px"
spacing:
  s1: "4px"
  s2: "8px"
  s3: "12px"
  s4: "16px"
  s5: "24px"
  s6: "32px"
  s7: "48px"
components:
  button-primary:
    backgroundColor: "{colors.bumper-yellow}"
    textColor: "{colors.plate-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 18px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.bumper-yellow-hover}"
  button-primary-xl:
    backgroundColor: "{colors.bumper-yellow}"
    textColor: "{colors.plate-ink}"
    rounded: "{rounded.card}"
    height: "56px"
  button-secondary:
    backgroundColor: "{colors.raised-graphite}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.md}"
    padding: "0 18px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.pressed-graphite}"
  button-ghost:
    textColor: "{colors.chalk-muted}"
    rounded: "{rounded.md}"
    padding: "0 18px"
    height: "44px"
  button-ghost-hover:
    backgroundColor: "{colors.raised-graphite}"
    textColor: "{colors.chalk}"
  button-danger:
    textColor: "{colors.miss-coral}"
    rounded: "{rounded.md}"
    padding: "0 18px"
    height: "44px"
  input:
    backgroundColor: "{colors.raised-graphite}"
    textColor: "{colors.chalk}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "9px 12px"
    height: "44px"
  stepper:
    backgroundColor: "{colors.raised-graphite}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.card}"
    height: "64px"
  chip:
    textColor: "{colors.chalk-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "40px"
  chip-selected:
    backgroundColor: "{colors.chalk}"
    textColor: "{colors.plate-ink}"
  badge:
    backgroundColor: "{colors.pressed-graphite}"
    textColor: "{colors.chalk-muted}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "2px 9px"
  panel:
    backgroundColor: "{colors.bench-graphite}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.lg}"
    padding: "24px"
  row:
    textColor: "{colors.chalk}"
    padding: "12px 0"
    height: "56px"
  tabbar-mobile:
    backgroundColor: "{colors.rubber-floor}"
    textColor: "{colors.chalk-muted}"
    height: "60px"
  rest-dock:
    backgroundColor: "{colors.bumper-yellow}"
    textColor: "{colors.plate-ink}"
    rounded: "{rounded.lg}"
    padding: "4px"
  toast:
    backgroundColor: "{colors.chalk}"
    textColor: "{colors.plate-ink}"
    rounded: "{rounded.card}"
    padding: "10px 18px"
  modal:
    backgroundColor: "{colors.bench-graphite}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.sheet}"
    padding: "24px"
---

# Design System: FitTrack Pro

## Overview

**Creative North Star: "The Night Gym"**

FitTrack Pro is a working tool used under bad gym lighting, phone in one sweaty hand, between sets. The ground is the rubber floor of a campus weight room at night: graphite surfaces stepping up in small tonal increments, chalk-white text, and exactly one action colour borrowed from the 15 kg bumper plate. Nothing glows, nothing is gradient-filled, nothing competes with the next set.

Density is moderate and list-led. Screens are built from one panel per job, with rows divided by hairlines inside it, rather than grids of coloured tiles. The set logger is visually the heaviest surface (big steppers, the plate readout, a full-width yellow save), and every other page defers to it. Numbers are always tabular; progress is shown as signed, neutral deltas, never as red/green judgement.

The one decorative system the app allows is functional: the IWF bumper-plate colour code, drawn as real plates on a bar to tell the lifter what to load. Icons are drawn line icons from a single inline sprite, never emoji.

**Key Characteristics:**
- Dark-only (`color-scheme: dark`), graphite ground with four tonal surface steps.
- One action accent (bumper yellow) with dark plate ink on top of it.
- Anuphan for all Thai and Latin text, tabular figures everywhere.
- Hairline-divided lists inside flat panels; no nested cards.
- 1.75px-stroke line icons at 20px (16px small, 22px in the mobile tab bar).
- Short ease-out state motion (100-250ms); everything off under reduced motion.

## Colors

A near-neutral graphite and chalk palette with one saturated yellow for action and a reserved plate code for weight data.

### Primary
- **Bumper Yellow** (`bumper-yellow`): the only action colour. Primary buttons, the active tab icon, focus ring, text caret, text selection, the rest dock, "today" markers, personal-record figures, the rank-1 number, the leading calculator result, and the volume series in charts. Hover lifts to `bumper-yellow-hover`.
- **Plate Ink** (`plate-ink`): text and icons placed on yellow or on chalk fills (primary button label, selected chip label, toast text, rest dock).

### Secondary (status hues)
- **Miss Coral** (`miss-coral`): destructive actions and errors; danger buttons are outlined, not filled.
- **Pass Green** (`pass-green`): completed plan items and verified/connected status (watch connected).
- **Signal Blue** (`signal-blue`): links, informational badges, and the cardio series in charts.
- **Caution Amber** (`caution-amber`): warning boxes and under-review states.

Each status hue has a soft companion used as a badge or box background: the same hue at roughly 11-12% alpha (`1c`/`1f` suffix), with a 33-40% alpha border where a box needs an edge.

### Tertiary (plate code, weight data only)
- **25 kg Red** (`plate-25-red`), **20 kg Blue** (`plate-20-blue`), **15 kg Yellow** (`plate-15-yellow`), **10 kg Green** (`plate-10-green`), **5 kg White** (`plate-5-white`), **Change-plate Grey** (`plate-change-grey`, 1.25 kg). The 2.5 kg change plate reuses the 25 kg red at reduced size, as on a real IWF set.

### Neutral
- **Rubber Floor** (`rubber-floor`): page background, top bar, mobile tab bar, the plate-readout well, idle camera stage.
- **Bench Graphite** (`bench-graphite`): panels, cards, modals, chips container, segmented controls.
- **Raised Graphite** (`raised-graphite`): inputs, steppers, secondary buttons, active desktop tab, duel sides, stat boxes.
- **Pressed Graphite** (`pressed-graphite`): hover on raised controls, selected tab inside a tab group, neutral badges, progress tracks, scrollbar thumb.
- **Hairline** (`hairline`): every 1px divider and panel border.
- **Steel Edge** (`steel-edge`): stronger 1px border on inputs, chips, steppers and secondary buttons (hover steps to #858c95).
- **Chalk** (`chalk`): primary text; also the inverted fill for selected chips/segments and the toast.
- **Chalk Muted** (`chalk-muted`): secondary text, labels, meta lines, inactive tabs and icons.

### Named Rules
**The One Plate Rule.** Bumper yellow is the only colour that means "do this". It appears once as a filled button per view at most, plus small signals (active tab icon, focus ring, PR figure). It is never a background wash or decorative fill.

**The Plate Code Rule.** The IWF plate colours describe weight on a bar and nothing else. They never colour buttons, categories or status.

**The Chalk Selection Rule.** Selection is shown by inverting to a chalk fill with plate-ink text (chips, segmented control), not by yellow, so yellow stays reserved for action.

**The Neutral Delta Rule.** Week-over-week deltas are signed and neutral: increases in chalk, decreases in chalk muted. Progress is never painted green or red.

## Typography

**Display Font:** Anuphan (with Noto Sans Thai, Leelawadee UI, Tahoma, system-ui)
**Body Font:** Anuphan (same stack)
**Label/Mono Font:** Anuphan; a system monospace stack appears only in the HR debug log.

**Character:** One variable family (100-700, self-hosted Thai and Latin subsets) carries everything. Its looped Thai and plain geometric Latin read well at arm's length, and weight (400/500/600/700) does all the hierarchy work.

### Hierarchy
- **Display** (600, 4.25rem, 1.1, -0.02em): live readouts only: rest timer, stopwatch (fluid 3-5rem), heart rate (4rem), camera rep count (4.5rem, 700, white with text shadow over video).
- **Headline** (700, 1.75rem, 1.3, -0.01em; 1.5rem under 760px): the page heading (`h1`), e.g. "วันนี้: ขา + สะโพก". Balanced wrapping.
- **Figure** (600, 1.375rem): numeric values in stat lists, summary stats, duel scores, plate totals, calculator results (lead result 1.75rem in yellow). Units sit beside in caption size, chalk muted.
- **Title** (600, 1.125rem, 1.3): panel and card headings (`h2`), modal titles step up to 1.375rem.
- **Body** (400, 1rem, 1.6): running text, inputs, row titles (row titles at 600).
- **Label** (500, 0.875rem): form labels, meta lines, nav and tab labels, buttons (600). Mobile tab labels drop to 0.75rem.
- **Caption** (600, 0.8125rem): badges, table headers (500), units, deltas, small-button text.

### Named Rules
**The Tabular Rule.** `font-variant-numeric: tabular-nums` is set on the body; every weight, rep, time and score aligns in columns without exception.

**The No-Caps Rule.** No uppercase transforms and no letter-spaced labels; Thai has no case, and Latin follows it. The only tracked text is the join code (0.08em).

## Layout

Single column on mobile, a max-width 1120px centred column on desktop with 24px side padding (16px on mobile). Page heads sit above content with the date or meta line under the heading, then panels stacked with 16px gaps.

Desktop pairs panels in two-column grids with a heavier left column: today (1.2fr / 1fr), logger (1.3fr / 1fr), challenge (1.4fr / 1fr), general split (1.25fr / 1fr). All collapse to one column at 900px. At 760px the top navigation moves to a fixed five-slot bottom tab bar (60px plus safe-area inset), form grids collapse, tables re-flow into stacked rows, and modals become bottom sheets.

Spacing follows a 4px base scale (`s1`-`s7`: 4, 8, 12, 16, 24, 32, 48). Panels pad 24px (16px mobile); list rows pad 12px vertically with a 56px minimum height. Bottom padding on mobile reserves room for the tab bar plus the rest dock.

**The Hairline List Rule.** Collections (plan, 7-day stats, sets, history, rankings, PBs, results) are rows separated by 1px hairlines inside one panel, the last row borderless. Do not wrap each row in its own card.

**The Thumb Floor Rule.** Every control is at least 44px tall; in-workout rows and the primary log button are 56px, stepper fields 64px.

## Elevation & Depth

Flat by default, with depth from tonal steps (floor, bench, raised, pressed) and hairline borders. Shadows exist only on layers that float above the page: modal, toast and rest dock. Inset shadows are used as drawing tools, not elevation (the brand mark's ring, the leading duel side's yellow inner outline, plate edge shading).

### Shadow Vocabulary
- **Float** (`box-shadow: 0 14px 40px #000a`): modal, toast, rest dock.
- **Focus halo** (`box-shadow: 0 0 0 3px` yellow at 12% alpha): inputs and steppers on focus, alongside a yellow border.

### Named Rules
**The Flat Floor Rule.** Panels, cards and rows never cast shadows. If something needs to stand out on the page, it changes surface step or border, not elevation.

## Shapes

Gently rounded, never pill-shaped except for things that are pills by nature. Controls use 10px corners, compact containers (steppers, list items in competitions, plate well, camera stage, toast, tab group) 12px, panels 14px (12px on mobile), sheets and modals 18px (top corners only on mobile). Chips, badges, the watch status chip and segmented controls are full pills; tags are 6px. Circles mark sequence and identity: plan step numbers (28px), set numbers (32px), the brand mark.

Borders are always 1px. Dashed borders mean "not interactive / placeholder" (static plan chips, idle camera stage).

## Components

### Buttons
Solid, compact, confident; pressed state nudges down 1px.
- **Shape:** gently rounded (10px); XL variant 12px.
- **Primary:** bumper yellow fill, plate-ink label at 600, 44px min height, 18px side padding. The XL block variant (56px, full width) is the log/start action.
- **Hover / Focus:** 150ms ease-out colour change to the lighter yellow; 2px yellow focus outline offset 2px; `:active` translates 1px; disabled at 50% opacity.
- **Secondary:** raised graphite fill with a steel-edge border, chalk label; hover steps to pressed graphite.
- **Ghost:** no fill, chalk-muted label; hover gains a raised fill and chalk text.
- **Danger:** outlined in coral at ~33% alpha with coral text; icon-only danger buttons stay muted until hover.
- **Icon button:** 44px square, label in `aria-label`.

### Chips
- **Style:** transparent pill with a steel-edge border, chalk-muted label, 40px tall; optional small suffix (e.g. "แผน") at 75% opacity.
- **State:** selected inverts to a chalk fill with plate-ink text. Static (non-tappable) chips are dashed.

### Cards / Containers
- **Corner Style:** 14px panels (12px on mobile and for compact items).
- **Background:** bench graphite on the rubber floor.
- **Shadow Strategy:** none (Flat Floor Rule).
- **Border:** 1px hairline. The session summary panel swaps to a yellow edge at ~33% alpha.
- **Internal Padding:** 24px desktop, 16px mobile; panel heads carry a title left and a quiet link or meta right.

### Inputs / Fields
- **Style:** raised graphite fill, 1px steel-edge border, 10px corners, 44px min height, 1rem text, yellow caret. Selects use a drawn chevron.
- **Focus:** yellow border plus a 3px soft-yellow halo; no outline.
- **Error / Disabled:** disabled at 55% opacity with not-allowed cursor. Warnings use the amber box (soft fill, amber border and text).

### Navigation
- **Desktop:** a sticky 60px top bar on the floor colour with a hairline bottom: wordmark left (yellow ring mark, "FitTrack" 700 + "Pro" 500 muted), centred icon+label tabs, and the heart-rate watch pill right. Active tab gets a raised fill, chalk label and a yellow icon.
- **Mobile:** five equal slots fixed to the bottom (วันนี้ / บันทึก / ชาเลนจ์ / อันดับ / ฉัน), 22px icons over 0.75rem labels, hairline top border, safe-area aware. Active state is only the yellow icon plus chalk label. A yellow dot with a floor-coloured ring flags pending items.
- **In-page:** tab groups sit in a bench-graphite track with 4px padding; the selected tab is pressed graphite at 600.

### Set Stepper (signature)
Two side-by-side steppers (kg, reps): a 12px-rounded raised field with 44px minus/plus wells flanking a centred 1.625rem/600 number, 64px tall. The whole stepper takes the yellow focus border and halo when its input is focused.

### Plate Readout (signature)
A rubber-floor well under the steppers draws the bar per side: a grey sleeve, a collar, then plates in IWF colours with heights by size (full-height 72px for 25/20/15/10, shorter for 5 kg and change plates) and a 3px inset edge shade. To the right, a caption label, the per-side load as a figure ("20 + 1.25"), and the bar weight. It is hidden when there is nothing to load.

### Rest Dock (signature)
After a set is saved, a yellow dock floats above everything (bottom-right on desktop; full width above the tab bar on mobile) with a timer icon, label, 1.25rem/700 countdown, a thin ink progress track and a pause button. It turns chalk when the rest is done. It follows the user across pages.

### Rows and Stat Lists
Rows are 56px minimum with an optional 40px raised icon tile, a title (600) with a muted sub line, and right-aligned figures or a chevron. Stat lists put a muted label left, a figure with muted unit, and a neutral signed delta right. Tables become stacked rows under 760px with inline muted labels.

### Badges and Toast
Badges are small pills: neutral on pressed graphite, or a status hue on its soft tint. The toast is a chalk slab with plate-ink text, 12px corners, bottom-centred above the tab bar, with an optional underlined action such as "เลิกทำ".

## Do's and Don'ts

### Do:
- **Do** keep one filled yellow action per view; use secondary or ghost buttons for everything else.
- **Do** draw icons from the inline sprite at 1.75px stroke, 20px (16px small), with `aria-hidden` and a text label or `aria-label`.
- **Do** present collections as hairline-divided rows inside one bench-graphite panel.
- **Do** show numbers in tabular figures with the unit in caption size and chalk muted beside them.
- **Do** keep every control at 44px or taller, and in-workout controls at 56px or taller.
- **Do** pair every status colour with words or an icon; status is never colour alone.
- **Do** keep motion to 100-250ms with the shared ease-out curve (`cubic-bezier(.2,.8,.2,1)`), and let reduced-motion switch it all off.

### Don't:
- **Don't** use emoji as icons or status markers.
- **Don't** introduce a second accent hue or paint surfaces with gradients.
- **Don't** use the plate colours for anything other than weight on a bar.
- **Don't** colour progress deltas green or red.
- **Don't** nest cards inside panels or build the dashboard as a grid of coloured KPI tiles.
- **Don't** put shadows on panels or cards; only floating layers get the float shadow.
- **Don't** use uppercase or letter-spaced labels above headings.
