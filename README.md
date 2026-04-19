# PromiseKeeper
PromiseKeeper watches the promises you make in iMessage and makes sure you do not forget them.

## Why This Is Native To iMessage
- It watches your outgoing iMessages for commitments.
- It stores and tracks promise state locally.
- It nudges you in one private control thread.
- It never needs a dashboard, app screen, or web UI.

## Why This Wins
- Personal utility: everyone drops follow-ups; this catches real misses.
- Conversation-native: runs fully in iMessage with one unified control thread.
- One-sentence explainability: it remembers what you said you’d do.
- Originality: promise memory + ghosting risk is sharper than generic chat in Messages.

## Core Product Behavior
- Detect commitments from outgoing messages.
- Remember commitments with due time, risk, status, and source message id.
- Follow up before due times or unresolved loops.
- Help close loops with `what did I promise`, `who am I ghosting`, and `draft follow-up`.

## Safety + Privacy
- Local-first memory in SQLite by default.
- Message monitoring runs on the user machine.
- No automatic texting of third parties without explicit user action.
- Optional LLM logic can stay disabled; prototype works fully in deterministic mode.

## Setup
PromiseKeeper runs locally on macOS using Photon’s iMessage SDK.

Full Disk Access is required for the terminal or IDE running PromiseKeeper.

1. Install dependencies:
```bash
bun install
```
2. Copy environment:
```bash
cp .env.example .env
```
3. Find and set control thread:
```bash
bun run find-control-thread
```
Pick your self-chat or chosen private thread, then copy its `chatId` into `.env` as `PROMISEKEEPER_CONTROL_THREAD_ID`.

4. Configure:
- `PROMISEKEEPER_DEMO_MODE`: `true` for demo transcript mode, `false` for live local mode.
- `PROMISEKEEPER_CONTROL_THREAD_ID`: required in non-demo mode.

This public `@photon-ai/imessage-kit` setup does not require API key or endpoint env variables.

## Photon Permissions Note
PromiseKeeper expects Photon access for:
- sending messages
- querying message history
- watching new messages in real time
- watching own outgoing messages
- scheduling reminder behavior

## Control Thread Model
Option A is implemented: your self chat (`controlThreadId = self`) acts as private control thread.

The app watches all relevant message traffic, but sends operational output only to the control thread unless explicitly asked to draft text for another person.

PromiseKeeper reads messages across chats to detect commitments.
PromiseKeeper sends operational replies only to the configured control thread.
PromiseKeeper should never auto-message third parties without explicit user approval.

## Commands
- `what did I promise`
- `due today`
- `due this week`
- `who am I ghosting`
- `mark done <id or label>`
- `snooze <id|all|label> <duration|time>`
- `draft follow-up <id>`
- `remind me at <time> about <text>`
- `ignore <id>`
- `recap`
- `help`
- `settings`

You can also use plain language in the same thread:
- `Code implementation due this week`
- `quiet hours 11pm to 7am`
- `enable native scheduler`

## Demo Mode
Works without live iMessage/Photon connectivity.

```bash
bun run seed
bun run demo
```

## Run
```bash
bun run dev
```

## Live Realtime Run
1. Set `.env` values:
- `PROMISEKEEPER_DEMO_MODE=false`
- `PROMISEKEEPER_CONTROL_THREAD_ID=<your self/control thread id>`
2. Start app:
```bash
bun run dev
```
3. If needed, discover chat ids:
```bash
bun run find-control-thread
```
3. Run live smoke checklist:
```bash
bun run smoke:live
```

The app hard-fails on startup in live mode if `PROMISEKEEPER_CONTROL_THREAD_ID` is missing.

## Architecture
- `src/sdk/*`: Photon transport wrapper, real-time watcher, scheduler loop.
- `src/detection/*`: deterministic commitment detection, due parsing, confidence scoring, optional extraction fallback.
- `src/memory/*`: SQLite schema, migrations, repositories.
- `src/services/*`: business logic for commitment ingestion, ghosting risk, recap, reminders, drafting.
- `src/commands/*`: command handlers and router for control-thread UX.
- `src/demo/*`: seeded data + simulated transcript runner.

## 30-Second Demo Script
1. Send three outgoing promises to different people.
2. PromiseKeeper posts “Tracked 3 new promises” in control thread.
3. Send `what did I promise`.
4. Send `draft follow-up 1`.
5. Send `mark done 1`.
6. Send `who am I ghosting`.

## Realistic Transcript
See [`examples/sample-transcript.md`](/Users/ssg/Desktop/FacetForge/PromiseKeeper/promisekeeper/examples/sample-transcript.md).

## Live Demo Proof
- Run transcript: [`examples/live-run-transcript.md`](/Users/ssg/Desktop/FacetForge/PromiseKeeper/promisekeeper/examples/live-run-transcript.md)
- Evidence checklist: [`examples/live-proof-checklist.md`](/Users/ssg/Desktop/FacetForge/PromiseKeeper/promisekeeper/examples/live-proof-checklist.md)
- Screenshots:
  - [`01-control-thread-help.png`](/Users/ssg/Desktop/FacetForge/PromiseKeeper/promisekeeper/examples/live-proof/screenshots/01-control-thread-help.png)
  - [`03-live-control-thread-active.png`](/Users/ssg/Desktop/FacetForge/PromiseKeeper/promisekeeper/examples/live-proof/screenshots/03-live-control-thread-active.png)
  - [`04-settings-and-freehand.png`](/Users/ssg/Desktop/FacetForge/PromiseKeeper/promisekeeper/examples/live-proof/screenshots/04-settings-and-freehand.png)

## Challenge Fit
This is a Photon-native personal agent that:
- reads/watches message streams including own outgoing messages,
- turns commitments into local memory,
- schedules nudges,
- keeps everything inside iMessage text UX.

## Limits
- Deterministic extraction can miss nuanced sarcasm/implicit obligations.
- Live mode uses a strict Photon adapter contract and will fail fast if required SDK methods are missing.
- Demo mode simulates transport and is intended for submission walkthroughs.

## Future Work
- Better participant importance ranking.
- Multi-commitment split from a single message.
- Better fuzzy-time normalization with locale-aware date parsing.
- Optional LLM polish for explanation and draft styles.

## Included Transcript (Challenge Prompt Variant)
[Outgoing to Rohan]  
I’ll send you the revised deck by tonight.

[Outgoing to Neha]  
Tomorrow works. I’ll confirm the place in the morning.

[Outgoing to Mom]  
Landed. I’ll call after I get home.

[Private control thread notification from PromiseKeeper]  
Tracked 3 new promises:
1. revised deck for Rohan — tonight
2. confirm place with Neha — tomorrow morning
3. call Mom — after getting home

Reply:
- what did I promise
- snooze 1 2h
- ignore 3

[User in control thread]  
what did I promise

[PromiseKeeper]  
You’ve got 3 open loops.

Due soon
1. revised deck for Rohan — tonight
2. call Mom — tonight

Tomorrow
3. confirm place with Neha — tomorrow morning

Most at risk: deck for Rohan.

[Later, PromiseKeeper]  
Deck for Rohan is due soon.  
Either send it, or text a delay update.

[User]  
draft follow-up 1

[PromiseKeeper]  
Draft:  
“Hey Rohan — quick heads-up: I’m running a bit behind on the revised deck. I’ll send it later tonight.”

[User]  
mark done 1

[PromiseKeeper]  
Marked done:  
revised deck for Rohan

Still open:
1. call Mom
2. confirm place with Neha

[Next morning]  
who am I ghosting

[PromiseKeeper]  
Possibly 2:
1. Mom — you said you’d call after getting home
2. Neha — you said you’d confirm this morning
