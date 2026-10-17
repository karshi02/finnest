---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: []
---

# Surface: FitTrack Pro app shell (index.html, all pages)

Mode: Operate. Build path: code-led (Operate surface). Redesign: the old red/blue gradient, emoji-icon, rainbow-stat world is retired; product truth, ids, functions and data stay.

Audience and job: a Thai student between sets in a dim gym at night, phone in one hand; logs a set in seconds, checks the rest timer, then competes on camera challenges with friends and faculty teams.

Owner decisions (2026-10-17): direction "ยิมกลางคืน" (night gym), all phases 0-4, 5-slot bottom navigation (วันนี้ / บันทึก / ชาเลนจ์ / อันดับ / ฉัน).

## Direction contract

THESIS: The set logger is the home of the app; the category default of a KPI dashboard with rainbow tiles and an emoji top nav is refused. Every screen answers "what do I lift next" before "how much have I lifted".

OWN-WORLD: Rubber-floor graphite ground (#121416, surfaces #1A1D21 / #23272C), chalk text (#EDEBE6, muted #A9ADB3), one action accent in bumper-plate yellow (#F2C230 with dark ink). The IWF bumper-plate colour code (red 25, blue 20, yellow 15, green 10, white 5 kg) is reserved for weight data only. Anuphan for all Thai and Latin text with tabular figures; drawn 1.75px stroke icons instead of emoji; 10px control radius, 14px panel radius; hairline dividers instead of nested cards.

STORY: Opening the app shows today's plan with each exercise tappable straight into the logger. Logging remembers last weight, adjusts with big steppers, and starts the rest timer, which follows the user across pages. Finishing shows what improved. Rankings and duels are one tap away with honest review states.

FIRST VIEWPORT: Mobile 390px. A compact top bar (wordmark left, HR status chip and profile right) and a fixed bottom bar of 5 icon+label tabs at 56px. "วันนี้" leads with the date and today's focus as a heading, then a plan list where each row is an exercise with target sets×reps and a log chevron. One full-width yellow primary "เริ่มบันทึกเวท" follows, then the 7-day stats as a hairline list of four rows with signed neutral deltas (adaptation: Thai labels such as "ปริมาณยก (Volume)" do not fit a 2×2 grid at 390px, and a list avoids the hero-metric tile pattern). The profile lives in the "ฉัน" tab rather than a top-right button (adaptation: a fifth navigation slot replaces the duplicate entry).

FORM: Night-gym working app (user-pinned direction B of the 3 shown in the plan; position 1 of the owner's list). Signature move: the barbell plate readout. Entering a kg value on a barbell lift draws the plates per side in bumper colours on a bar, as a real loading aid. seed:c174f6433a92069c (rolled after the owner pinned direction B; the pinned direction beats the roll, recorded for provenance). Signature interaction: a set-done tap starts the rest dock, a slim yellow countdown bar docked above the tab bar on every page. Motion grammar: 150-220ms ease-out state changes only, with a single count-up on the session summary; all motion is off under reduced motion.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
