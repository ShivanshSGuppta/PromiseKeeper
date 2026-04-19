import { endOfDay, startOfDay } from "../utils/dates";
import { CommitmentRepository } from "../memory/repositories";

export class RecapService {
  constructor(private commitments: CommitmentRepository) {}

  generate(): string {
    const now = new Date();
    const todayFrom = startOfDay(now).toISOString();
    const todayTo = endOfDay(now).toISOString();
    const todayOpen = this.commitments.listDueBetween(todayFrom, todayTo);
    const open = this.commitments.listOpen();
    const completed = this.commitments.listRecentlyCompleted(5).filter((c) => {
      if (!c.completedAt) return false;
      const t = new Date(c.completedAt).getTime();
      return t >= startOfDay(now).getTime() && t <= endOfDay(now).getTime();
    });
    const atRisk = open.filter((c) => c.status === "overdue" || c.riskScore > 70).slice(0, 4);

    return [
      "Recap",
      "Promises made today: " + todayOpen.length,
      "Promises completed today: " + completed.length,
      "At-risk commitments: " + atRisk.length,
      open.length ? "Biggest open loops: " + open.slice(0, 3).map((c) => c.title).join("; ") : "Biggest open loops: none"
    ].join("\n");
  }
}

