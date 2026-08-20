import './env.js';
import pg from 'pg';

const adminConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

const dbName = process.env.DB_NAME || 'onenote';

async function setup() {
  console.log('Connecting to PostgreSQL...');
  const client = new pg.Client({ ...adminConfig, database: 'postgres' });

  try {
    await client.connect();
    console.log('Connected.');

    const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (!exists.rows.length) {
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`Database "${dbName}" created.`);
    } else {
      console.log(`Database "${dbName}" already exists.`);
    }
  } finally {
    await client.end();
  }

  // Run migrations
  process.env.DB_NAME = dbName;
  await import('./migrate.js');
}

setup().catch((err) => {
  console.error('\nSetup failed:', err.message);
  console.error('\nFix: Edit .env in project root and set your PostgreSQL password:');
  console.error('  DB_PASSWORD=your_actual_password\n');
  process.exit(1);
});
