import type { AppConfig } from "../types";
import { CommitmentRepository, ManualReminderRepository } from "../memory/repositories";
import { handleDraftFollowUp } from "./draftFollowUp";
import { handleDueThisWeek } from "./dueThisWeek";
import { handleDueToday } from "./dueToday";
import { handleHelp } from "./help";
import { handleIgnore } from "./ignore";
import { handleMarkDone } from "./markDone";
import { handleRecap } from "./recap";
import { handleRemindMe } from "./remindMe";
import { handleSettings } from "./settings";
import { handleSnooze } from "./snooze";
import { handleWhatDidIPromise } from "./whatDidIPromise";
import { handleWhoAmIGhosting } from "./whoAmIGhosting";
import { DraftingService } from "../services/draftingService";
import { GhostingService } from "../services/ghostingService";
import { RecapService } from "../services/recapService";

export interface RouterDeps {
  commitments: CommitmentRepository;
  manualReminders: ManualReminderRepository;
  drafting: DraftingService;
  ghosting: GhostingService;
  recap: RecapService;
  config: AppConfig;
}

export class CommandRouter {
  constructor(private deps: RouterDeps) {}

  route(input: string): string | null {
    const text = input.trim();
    const lower = text.toLowerCase();

    if (!text) return null;
    if (lower === "help") return handleHelp();
    if (lower === "what did i promise") return handleWhatDidIPromise(this.deps.commitments);
    if (lower === "due today") return handleDueToday(this.deps.commitments);
    if (lower === "due this week") return handleDueThisWeek(this.deps.commitments);
    if (lower === "who am i ghosting") return handleWhoAmIGhosting(this.deps.ghosting);
    if (lower === "recap") return handleRecap(this.deps.recap);
    if (lower === "settings") return handleSettings(this.deps.config);

    if (lower.startsWith("mark done ")) return handleMarkDone(this.deps.commitments, text.slice("mark done ".length).trim());
    if (lower.startsWith("ignore ")) return handleIgnore(this.deps.commitments, text.slice("ignore ".length).trim());
    if (lower.startsWith("snooze ")) return handleSnooze(this.deps.commitments, text.slice("snooze ".length).trim());
    if (lower.startsWith("draft follow-up "))
      return handleDraftFollowUp(this.deps.commitments, this.deps.drafting, text.slice("draft follow-up ".length).trim());
    if (lower.startsWith("remind me ")) return handleRemindMe(this.deps.manualReminders, text.slice("remind me ".length).trim());

    return null;
  }
}

