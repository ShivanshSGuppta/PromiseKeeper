const steps = [
  "Live smoke test checklist",
  "1. Set PROMISEKEEPER_DEMO_MODE=false in .env.",
  "2. Run: bun run find-control-thread",
  "3. Set PROMISEKEEPER_CONTROL_THREAD_ID to your self chat or trusted control thread chatId.",
  "4. Run: bun run dev",
  "5. Send one outgoing promise in iMessage (e.g., 'I'll send the deck tonight').",
  "6. Confirm PromiseKeeper posts tracked notification in control thread.",
  "7. In control thread, run: what did I promise",
  "8. In control thread, run: draft follow-up <id>",
  "9. In control thread, run: mark done <id>",
  "10. Verify commitment status moved to done and open-loop count dropped."
];

console.log(steps.join("\n"));
