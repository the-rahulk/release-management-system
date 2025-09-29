import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Use environment variables for local PostgreSQL configuration
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432');
const DB_NAME = process.env.DB_NAME || 'rms_master_db';
const DB_USER = process.env.DB_USER || 'rms_user';
const DB_PASSWORD = process.env.DB_PASSWORD || 'release123';
const DB_MAX_CONNECTIONS = parseInt(process.env.DB_MAX_CONNECTIONS || '20');

// Create connection string for local PostgreSQL
const connectionString = `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;

export const pool = new Pool({
  connectionString,
  max: DB_MAX_CONNECTIONS,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const db = drizzle(pool, { schema });
