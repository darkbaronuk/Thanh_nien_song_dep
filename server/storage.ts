import fs from "node:fs";
import path from "node:path";
import { nominations } from "@shared/schema";
import type { Nomination, InsertNomination } from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc } from "drizzle-orm";

const DATA_DIR = process.env.DATA_DIR || process.cwd();
fs.mkdirSync(DATA_DIR, { recursive: true });
const sqlite = new Database(path.join(DATA_DIR, "data.db"));
sqlite.pragma("journal_mode = WAL");

sqlite.exec(`
CREATE TABLE IF NOT EXISTS nominations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL,
  created_at TEXT NOT NULL,
  nominator_type TEXT NOT NULL,
  nominator_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  dob TEXT NOT NULL,
  gender TEXT NOT NULL DEFAULT '',
  ethnicity TEXT NOT NULL DEFAULT '',
  religion TEXT NOT NULL DEFAULT '',
  residence TEXT NOT NULL DEFAULT '',
  workplace TEXT NOT NULL DEFAULT '',
  position TEXT NOT NULL DEFAULT '',
  candidate_phone TEXT NOT NULL DEFAULT '',
  candidate_email TEXT NOT NULL DEFAULT '',
  candidate_group TEXT NOT NULL,
  field TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  files TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'moi',
  ai_status TEXT NOT NULL DEFAULT 'chua',
  ai_result TEXT,
  reviewer_note TEXT NOT NULL DEFAULT ''
);
`);

// Bổ sung cột cho các bản cơ sở dữ liệu tạo trước khi có tính năng đồng bộ Drive
for (const [col, def] of [
  ["drive_folder_id", "TEXT NOT NULL DEFAULT ''"],
  ["drive_folder_url", "TEXT NOT NULL DEFAULT ''"],
  ["drive_files", "TEXT NOT NULL DEFAULT '{}'"],
  ["drive_status", "TEXT NOT NULL DEFAULT 'chua'"],
  ["drive_synced_at", "TEXT NOT NULL DEFAULT ''"],
] as const) {
  try {
    sqlite.exec(`ALTER TABLE nominations ADD COLUMN ${col} ${def};`);
  } catch {
    // cột đã tồn tại
  }
}

export const db = drizzle(sqlite);

export const storage = {
  list(): Nomination[] {
    return db.select().from(nominations).orderBy(desc(nominations.id)).all();
  },
  get(id: number): Nomination | undefined {
    return db.select().from(nominations).where(eq(nominations.id, id)).get();
  },
  create(data: InsertNomination): Nomination {
    return db.insert(nominations).values(data).returning().get();
  },
  update(id: number, data: Partial<InsertNomination>): Nomination | undefined {
    return db.update(nominations).set(data).where(eq(nominations.id, id)).returning().get();
  },
  remove(id: number) {
    db.delete(nominations).where(eq(nominations.id, id)).run();
  },
};
