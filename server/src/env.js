import { existsSync } from 'fs';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../../.env');

// Local dev only — .env is gitignored; production uses Docker/GitHub Secrets env vars
if (existsSync(envPath)) {
  config({ path: envPath });
}
