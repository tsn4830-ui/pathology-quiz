-- 花費明細
CREATE TABLE IF NOT EXISTS expenses (
  id         TEXT PRIMARY KEY,
  date       TEXT NOT NULL,
  name       TEXT NOT NULL,
  amt        INTEGER NOT NULL,
  cat        TEXT NOT NULL,
  pay        TEXT NOT NULL,
  note       TEXT,
  created_at INTEGER NOT NULL
);

-- 共用設定(例:匯率)
CREATE TABLE IF NOT EXISTS settings (
  k TEXT PRIMARY KEY,
  v TEXT
);
