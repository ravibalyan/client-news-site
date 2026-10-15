CREATE TABLE settings_rebuild (
  key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO settings_rebuild(key,value,updated_by,updated_at) SELECT key,value,updated_by,updated_at FROM settings;
DROP TABLE settings;
ALTER TABLE settings_rebuild RENAME TO settings;

CREATE TABLE media_rebuild (
  id TEXT PRIMARY KEY, key TEXT NOT NULL UNIQUE, filename TEXT NOT NULL, content_type TEXT NOT NULL,
  size INTEGER NOT NULL, created_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO media_rebuild(id,key,filename,content_type,size,created_by,created_at) SELECT id,key,filename,content_type,size,created_by,created_at FROM media;
DROP TABLE media;
ALTER TABLE media_rebuild RENAME TO media;
