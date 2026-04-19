declare module "bun:sqlite" {
  export class Database {
    constructor(filename: string, options?: { create?: boolean; strict?: boolean });
    exec(sql: string): void;
    close(): void;
    query(sql: string): {
      run(...params: unknown[]): { lastInsertRowid?: number | bigint; changes?: number | bigint };
      get(...params: unknown[]): Record<string, unknown> | null;
      all(...params: unknown[]): Record<string, unknown>[];
    };
  }
}

