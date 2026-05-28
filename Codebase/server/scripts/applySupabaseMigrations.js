const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env"), quiet: true });

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DIRECT_URL or DATABASE_URL is required to run migrations.");
  process.exit(1);
}

let parsedUrl;
try {
  parsedUrl = new URL(connectionString);
} catch (error) {
  console.error("The configured database connection string is not a valid URL.");
  process.exit(1);
}

const placeholderParts = ["project-ref", "region.pooler.supabase.com"];
if (
  placeholderParts.some(
    (part) => parsedUrl.hostname.includes(part) || parsedUrl.username.includes(part)
  )
) {
  console.error(
    "The configured DATABASE_URL/DIRECT_URL still contains Supabase placeholder values."
  );
  console.error(
    "Set DIRECT_URL to the real Supabase direct connection string before running migrations."
  );
  process.exit(1);
}

const migrationsDir = path.join(__dirname, "..", "supabase", "migrations");
const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(
  parsedUrl.hostname
);

const client = new Client({
  connectionString,
  ssl: isLocalHost ? false : { rejectUnauthorized: false },
});

const migrationTableSql = `
  create table if not exists public.iutverse_schema_migrations (
    version text primary key,
    applied_at timestamptz not null default now()
  );
`;

const run = async () => {
  console.log(
    `Applying Supabase migrations to ${parsedUrl.hostname}:${parsedUrl.port || "5432"}`
  );

  await client.connect();
  await client.query(migrationTableSql);

  const { rows } = await client.query(
    "select version from public.iutverse_schema_migrations"
  );
  const applied = new Set(rows.map((row) => row.version));

  for (const file of migrationFiles) {
    if (applied.has(file)) {
      console.log(`Skipping already applied migration: ${file}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    console.log(`Applying migration: ${file}`);

    await client.query("begin");
    try {
      await client.query(sql);
      await client.query(
        "insert into public.iutverse_schema_migrations(version) values($1)",
        [file]
      );
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }

  console.log("Supabase migrations complete.");
};

run()
  .catch((error) => {
    console.error("Migration failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end().catch(() => {});
  });
