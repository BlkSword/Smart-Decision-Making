import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

// For AI simulation system, we use the backend API instead of direct database access
// This is a placeholder to maintain compatibility with the template
const POSTGRES_URL = process.env.POSTGRES_URL || 'postgresql://dummy:dummy@localhost:5432/dummy';

export const client = postgres(POSTGRES_URL);
export const db = drizzle(client, { schema });

// Note: In the AI simulation system, data is managed by the FastAPI backend
// This database connection is kept for template compatibility but not actively used
