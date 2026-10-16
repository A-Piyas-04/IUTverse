-- Runs once, as supabase_admin, when the database volume is first created
-- (the supabase/postgres image executes /etc/postgresql.schema.sql after its
-- own init). Same setup the Supabase CLI applies to local stacks.
\set pgpass `echo "$POSTGRES_PASSWORD"`
\set jwt_secret `echo "$JWT_SECRET"`
\set jwt_exp `echo "$JWT_EXP"`

alter database postgres set "app.settings.jwt_secret" to :'jwt_secret';
alter database postgres set "app.settings.jwt_exp" to :'jwt_exp';

-- Service roles log in with the stack password.
alter user postgres with password :'pgpass';
alter user authenticator with password :'pgpass';
alter user supabase_auth_admin with password :'pgpass';
alter user supabase_storage_admin with password :'pgpass';

-- Realtime keeps its tenant metadata here.
create schema if not exists _realtime;
alter schema _realtime owner to postgres;
