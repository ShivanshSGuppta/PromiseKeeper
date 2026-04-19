# Live Proof Checklist

## Evidence Files
- `examples/live-run-transcript.md`
- `examples/live-proof/screenshots/01-control-thread-help.png`
- `examples/live-proof/screenshots/02-self-chat-routing-before-fix.png`
- `examples/live-proof/screenshots/03-live-control-thread-active.png`
- `examples/live-proof/screenshots/04-settings-and-freehand.png`
- `examples/live-proof/screenshots/05-settings-view.png`

## What Each Screenshot Shows
1. `01-control-thread-help.png`
   - Control-thread command request and response loop is working.
2. `02-self-chat-routing-before-fix.png`
   - Baseline self-chat confusion case used for comparison.
3. `03-live-control-thread-active.png`
   - Live watcher receiving self-chat traffic and route handling active.
4. `04-settings-and-freehand.png`
   - Freehand + command interaction in one thread.
5. `05-settings-view.png`
   - Settings output in control thread after updates.

## Verification Claims
- Operational responses are routed to configured control thread.
- Freehand task capture and command workflow coexist in one flow.
- Settings are editable in chat and reflected in settings output.
- Duplicate reply/task spam is suppressed by dedupe + throttle.
