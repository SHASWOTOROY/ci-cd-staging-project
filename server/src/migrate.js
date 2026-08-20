import './env.js';
import { pool } from './db.js';

const migrations = `
CREATE TABLE IF NOT EXISTS notebooks (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL DEFAULT 'My Notebook',
  color VARCHAR(7) DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  notebook_id INTEGER REFERENCES notebooks(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL DEFAULT 'Untitled',
  content TEXT DEFAULT '',
  is_pinned BOOLEAN DEFAULT FALSE,
  color VARCHAR(7) DEFAULT '#ffffff',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pinned_links (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  url TEXT NOT NULL,
  description TEXT DEFAULT '',
  icon VARCHAR(50) DEFAULT 'link',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_notebook ON notes(notebook_id);
CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(is_pinned);
CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at DESC);

INSERT INTO notebooks (name, color)
SELECT 'My Notebook', '#6366f1'
WHERE NOT EXISTS (SELECT 1 FROM notebooks LIMIT 1);

INSERT INTO pinned_links (title, url, description, icon, sort_order)
SELECT * FROM (VALUES
  ('GitHub Docs', 'https://docs.github.com', 'GitHub documentation', 'github', 1),
  ('React Docs', 'https://react.dev', 'Official React documentation', 'react', 2)
) AS v(title, url, description, icon, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM pinned_links LIMIT 1);
`;

async function migrate() {
  console.log('Running migrations...');
  await pool.query(migrations);
  console.log('Migrations complete.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
