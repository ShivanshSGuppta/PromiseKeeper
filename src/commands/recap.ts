import { RecapService } from "../services/recapService";

export function handleRecap(recap: RecapService): string {
  return recap.generate();
}

