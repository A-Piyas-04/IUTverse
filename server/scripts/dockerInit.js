// One-shot database setup for the Docker Compose stack: applies every migration
// in supabase/migrations, then (unless SEED_DEMO_DATA=false) loads the starter
// data from supabase/seed_iutverse.sql once.
//
// The seed needs an existing profile to own its content. On an empty database
// this creates a "seed owner" account with no password, so it cannot sign in.
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const SEED_MARKER = "seed:seed_iutverse.sql";
const SEED_OWNER_ID = "00000000-0000-4000-8000-000000000001";

const migrate = () => {
  const result = spawnSync(process.execPath, [path.join(__dirname, "applySupabaseMigrations.js")], { stdio: "inherit" });
  if (result.status !== 0) throw new Error("Migrations failed");
};

const seed = async () => {
  if (process.env.SEED_DEMO_DATA === "false") {
    console.log("SEED_DEMO_DATA=false; skipping starter data.");
    return;
  }

  const client = new Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rowCount: seeded } = await client.query("select 1 from public.iutverse_schema_migrations where version = $1", [SEED_MARKER]);
    if (seeded) {
      console.log("Starter data already loaded.");
      return;
    }

    const { rows } = await client.query("select count(*)::int as count from public.profiles");
    if (rows[0].count === 0) {
      // The on_auth_user_created trigger creates the profile and membership.
      await client.query(
        `insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
           confirmation_token, recovery_token, email_change_token_new, email_change,
           raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
         values ('00000000-0000-0000-0000-000000000000', $1, 'authenticated', 'authenticated',
           'seed.owner@iut-dhaka.edu', '', now(), '', '', '', '',
           '{"provider":"email","providers":["email"]}', '{"display_name":"IUTverse"}', now(), now())
         on conflict (id) do nothing`,
        [SEED_OWNER_ID]
      );
    }

    console.log("Loading starter data...");
    await client.query(fs.readFileSync(path.join(__dirname, "..", "supabase", "seed_iutverse.sql"), "utf8"));
    await client.query("insert into public.iutverse_schema_migrations (version) values ($1) on conflict do nothing", [SEED_MARKER]);
    console.log("Starter data loaded.");
  } finally {
    await client.end().catch(() => {});
  }
};

(async () => {
  migrate();
  await seed();
})().catch((error) => {
  console.error("Database setup failed:", error.message);
  process.exit(1);
});
