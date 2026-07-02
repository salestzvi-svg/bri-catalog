#!/usr/bin/env node
/**
 * מפעיל migration-fix-rls-safe.sql על מסד Supabase.
 * דורש סיסמת מסד (לא מפתח API):
 *   SUPABASE_DB_PASSWORD=... npm run db:enable-rls
 * או:
 *   DATABASE_URL=postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres npm run db:enable-rls
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const { Client } = pg;
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sqlPath = join(root, "supabase", "migration-fix-rls-safe.sql");

function getConnectionConfig() {
  const databaseUrl = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;
  if (databaseUrl) {
    return { connectionString: databaseUrl, ssl: { rejectUnauthorized: false } };
  }

  const password = process.env.SUPABASE_DB_PASSWORD;
  const projectRef =
    process.env.SUPABASE_PROJECT_REF ??
    process.env.NEXT_PUBLIC_SUPABASE_URL?.match(
      /https:\/\/([^.]+)\.supabase\.co/
    )?.[1];

  if (!password || !projectRef) {
    throw new Error(
      "חסרה סיסמת מסד. הגדר SUPABASE_DB_PASSWORD (מ-Supabase Dashboard → Project Settings → Database) או DATABASE_URL."
    );
  }

  return {
    host: process.env.SUPABASE_DB_HOST ?? `db.${projectRef}.supabase.co`,
    port: Number(process.env.SUPABASE_DB_PORT ?? 5432),
    user: process.env.SUPABASE_DB_USER ?? "postgres",
    password,
    database: process.env.SUPABASE_DB_NAME ?? "postgres",
    ssl: { rejectUnauthorized: false },
  };
}

function splitSqlStatements(sql) {
  const statements = [];
  let current = "";
  let inDollarQuote = false;

  for (const line of sql.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("--")) {
      continue;
    }

    if (line.includes("$$")) {
      const parts = line.split("$$");
      for (let i = 0; i < parts.length; i++) {
        current += parts[i];
        if (i < parts.length - 1) {
          inDollarQuote = !inDollarQuote;
          current += "$$";
        }
      }
    } else {
      current += `${line}\n`;
    }

    if (!inDollarQuote && trimmed.endsWith(";")) {
      const statement = current.trim();
      if (statement) {
        statements.push(statement);
      }
      current = "";
    }
  }

  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements;
}

async function verifyAnonBlocked() {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const url =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    "";

  if (!anonKey || !url) {
    console.log("דילוג על בדיקת Anon Key (חסרים משתני סביבה).");
    return;
  }

  const base = url.replace(/\/+$/, "");
  const response = await fetch(`${base}/rest/v1/stores?select=id&limit=1`, {
    headers: { apikey: anonKey },
  });
  const body = await response.text();

  if (response.ok && body !== "[]") {
    throw new Error(
      `Anon Key עדיין יכול לגשת ל-stores (HTTP ${response.status}): ${body.slice(0, 120)}`
    );
  }

  console.log(`בדיקת Anon Key: חסום (HTTP ${response.status}).`);
}

async function main() {
  const sql = readFileSync(sqlPath, "utf8");
  const statements = splitSqlStatements(sql).filter(
    (statement) =>
      !statement.startsWith("select tablename, rowsecurity") &&
      !statement.startsWith("select tablename, policyname")
  );

  const client = new Client(getConnectionConfig());
  await client.connect();
  console.log("מחובר למסד — מפעיל RLS...");

  try {
    for (const statement of statements) {
      await client.query(statement);
    }

    const rls = await client.query(`
      select tablename, rowsecurity
      from pg_tables
      where schemaname = 'public'
      order by tablename
    `);
    const policies = await client.query(`
      select tablename, policyname
      from pg_policies
      where schemaname = 'public'
      order by tablename
    `);

    const disabled = rls.rows.filter((row) => !row.rowsecurity);
    if (disabled.length > 0) {
      throw new Error(
        `RLS לא פעיל על: ${disabled.map((row) => row.tablename).join(", ")}`
      );
    }

    if (policies.rows.length > 0) {
      throw new Error(
        `עדיין יש policies פתוחות: ${policies.rows
          .map((row) => `${row.tablename}.${row.policyname}`)
          .join(", ")}`
      );
    }

    console.log(`RLS פעיל על ${rls.rows.length} טבלאות, 0 policies פתוחות.`);
  } finally {
    await client.end();
  }

  await verifyAnonBlocked();
  console.log("האבטחה הופעלה בהצלחה.");
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
