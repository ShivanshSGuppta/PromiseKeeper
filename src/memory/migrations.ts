import { DB } from "./db";

export function runMigrations(db: DB): void {
  db.initSchema();
}
