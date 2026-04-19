import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { logger } from "../utils/logger";

export class DB {
  readonly sqlite: Database;

  constructor(path: string) {
    this.sqlite = new Database(path, { create: true, strict: true });
  }

  initSchema(): void {
    const schemaUrl = new URL("./schema.sql", import.meta.url);
    const sql = readFileSync(schemaUrl, "utf8");
    this.sqlite.exec(sql);
    logger.info("DB schema initialized");
  }

  close(): void {
    this.sqlite.close();
  }
}
