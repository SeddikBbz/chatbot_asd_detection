const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    '[supabaseClient] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are missing from your .env file.\n' +
    'The server will still start (useful for running the offline test suite),\n' +
    'but every database call will fail until you set real Supabase credentials.'
  );
}

// The service_role key is used because this file only ever runs on the
// server (never sent to the browser). It bypasses Row Level Security,
// which is fine here because RLS on every table has zero policies, so
// the anon key used by any client-side code could not touch the data
// anyway. See db/schema.sql for details.
const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key',
  {
    auth: { persistSession: false, autoRefreshToken: false },
  }
);

module.exports = supabase;
