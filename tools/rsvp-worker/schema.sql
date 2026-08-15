CREATE TABLE IF NOT EXISTS rsvps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  attending TEXT NOT NULL,
  plus_one TEXT,
  plus_one_name TEXT,
  dietary TEXT,
  note TEXT,
  created_at TEXT NOT NULL
);
