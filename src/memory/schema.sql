PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS user_profile (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  control_thread_id TEXT NOT NULL,
  timezone TEXT NOT NULL,
  quiet_hours_start TEXT NOT NULL,
  quiet_hours_end TEXT NOT NULL,
  reminder_style TEXT NOT NULL,
  detection_sensitivity TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commitment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  normalized_action TEXT NOT NULL,
  category TEXT NOT NULL,
  participant TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  source_message_id TEXT NOT NULL UNIQUE,
  source_message_at TEXT NOT NULL,
  due_at TEXT,
  due_text TEXT,
  status TEXT NOT NULL,
  confidence TEXT NOT NULL,
  risk_score INTEGER NOT NULL DEFAULT 0,
  reminder_state TEXT NOT NULL DEFAULT 'none',
  last_reminder_at TEXT,
  snoozed_until TEXT,
  completed_at TEXT,
  ignored_at TEXT,
  canceled_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commitment_event (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  commitment_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(commitment_id) REFERENCES commitment(id)
);

CREATE TABLE IF NOT EXISTS conversation_state (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  participant TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  last_inbound_at TEXT,
  last_outbound_at TEXT,
  unresolved_loop_count INTEGER NOT NULL DEFAULT 0,
  ghosting_risk INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(participant, chat_id)
);

CREATE TABLE IF NOT EXISTS manual_reminder (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  due_at TEXT NOT NULL,
  status TEXT NOT NULL,
  created_from_command TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_commitment_status ON commitment(status);
CREATE INDEX IF NOT EXISTS idx_commitment_due_at ON commitment(due_at);
CREATE INDEX IF NOT EXISTS idx_conversation_ghosting_risk ON conversation_state(ghosting_risk DESC);
CREATE INDEX IF NOT EXISTS idx_commitment_chat_id ON commitment(chat_id);
