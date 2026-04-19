import type { Commitment } from "../types";

function tonePrefix(style: "neutral" | "polite"): string {
  return style === "polite" ? "Hey" : "Hi";
}

export class DraftingService {
  draftFollowUp(commitment: Commitment, style: "neutral" | "polite" = "neutral"): string {
    const intro = tonePrefix(style);
    const recipient = commitment.participant || "there";
    const action = commitment.normalizedAction || commitment.title;
    if (commitment.status === "overdue") {
      return intro + " " + recipient + " — quick update: I'm running behind on " + action + ". I'll send an update shortly.";
    }
    return intro + " " + recipient + " — quick update: " + action + ". I'll confirm once it's done.";
  }

  draftApology(commitment: Commitment): string {
    return (
      "Hey " +
      commitment.participant +
      " — sorry for the delay on " +
      commitment.normalizedAction +
      ". I should have updated you earlier."
    );
  }
}

