# Product

<!-- impeccable:product-schema 1 -->

> Recorded 2026-10-17 from the repository, `Docs/` reports, the project book and the owner's answers in the redesign round. The owner asked for the redesign to run start to finish without further interview, so facts marked *(inferred)* come from repository evidence rather than a direct answer.

## Platform

web

## Users

- **Primary:** Thai university students (Rajabhat Maha Sarakham University; project team in Computer Engineering) who are new or early in strength training. They train in a campus gym or at home in the evening, phone in hand or on the bench, logging between sets. *(inferred from the book and plan docs)*
- **Secondary:** the same students competing with friends and faculty teams through camera-counted push-ups, squats and planks.
- **Admins:** a few named moderators (`ADMIN_USERNAMES`) who review flagged leaderboard entries.

## Product Purpose

FitTrack Pro is a single-file Thai PWA for logging weight training and cardio, reading heart rate from a watch, and competing on camera-verified bodyweight challenges. Success means a student can log a set in seconds between sets, sees progress over weeks, and keeps coming back because friends and their faculty team are on the board.

## Positioning

- Reps are counted by the phone camera in the browser (MediaPipe Pose); video never leaves the device unless the user opts in as proof.
- Leaderboards and duels are anti-cheat checked: the server recounts reps from the joint-angle trace.
- Teams are organised by faculty, with duels between friends.
- It works offline for personal logging. Online features run on Supabase behind Vercel functions.

## Operating Context

- Mostly mobile Chrome on Android, often in a dim gym at night, between sets with sweaty hands. Desktop is used for review and admin.
- Huawei watches broadcast HR over Web Bluetooth; activities sync from Huawei Health through Strava.
- Data lives in `localStorage` (`fittrack`, schema v2) with JSON export/import. Accounts are username + password with no email, under PDPA consent.

## Capabilities and Constraints

- Pages: dashboard, weight log + exercise library (30 exercises with YouTube videos), cardio log + stopwatch + HR zones, weekly plan + programs, calculators (BMR/TDEE, BMI, macros, 1RM), camera challenge, leaderboard / competitions / account / admin.
- Single `index.html` with no build step, plus `api/*.js` Vercel functions, `sw.js` and `vendor/chart.umd.min.js`.
- Existing automated suites (unit, headless e2e, live Supabase) must keep passing. Element ids and global function names are their contract.
- Thai is the UI language. English stays for exercise names and standard terms (RIR, 1RM, TDEE), which get a short Thai explanation.

## Brand Commitments

- Name: **FitTrack Pro**.
- Voice: friendly, short Thai. Encouraging but not hype.

## Evidence on Hand

- Real feature set and test counts are in `Docs/FIX-REPORT-*.md`. The project book is `Docs/PROJECT-BOOK.pdf` (70 pages).
- No testimonials, user counts or benchmarks exist. Do not invent them.

## Product Principles

1. The set logger is the product. Every other surface is one tap from it and never slows it down.
2. Show progress, not totals: last time, personal records, this week versus last.
3. Competition is earned and honest. Show what was verified and why something is under review.
4. Never lose data. Logging works offline, and destructive actions can be undone or are confirmed.
5. A beginner should understand every number on screen without leaving the app.

## Accessibility & Inclusion

- Large tap targets for in-workout controls (≥48px), and ≥44px elsewhere.
- WCAG AA contrast and a visible keyboard focus.
- Respect `prefers-reduced-motion`.
- Status is never conveyed by colour or emoji alone.
