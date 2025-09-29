import { defineConfig } from "drizzle-kit";

// Use local PostgreSQL configuration
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || '5432';
const DB_NAME = process.env.DB_NAME || 'rms_master_db';
const DB_USER = process.env.DB_USER || 'rms_user';
const DB_PASSWORD = process.env.DB_PASSWORD || 'release123';

const connectionString = `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
