import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure neon for serverless environments
neonConfig.webSocketConstructor = ws;

// Enhanced database URL validation
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Validate DATABASE_URL format
try {
  new URL(process.env.DATABASE_URL);
} catch (error) {
  console.error('Invalid DATABASE_URL format:', process.env.DATABASE_URL);
  throw new Error('DATABASE_URL must be a valid PostgreSQL connection string');
}

console.log('Initializing database connection pool...');

// Create connection pool with enhanced configuration for Cloud Run
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client can sit idle before being closed
  connectionTimeoutMillis: 10000, // How long to wait for a connection
});

// Test the connection immediately
pool.on('connect', () => {
  console.log('Database client connected successfully');
});

pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

export const db = drizzle({ client: pool, schema });

console.log('Database connection initialized');