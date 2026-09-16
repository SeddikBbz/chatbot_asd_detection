/**
 * Run this AFTER you have:
 *   1. created a Supabase project,
 *   2. run db/schema.sql in the Supabase SQL editor,
 *   3. filled in .env with your real SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.
 *
 * Usage:  npm run check:supabase
 *
 * It performs a real insert/read/delete round trip against the `users`
 * table so you can confirm the app is actually wired to your Supabase
 * project before you rely on it. This script needs network access to
 * reach *.supabase.co, which the sandbox that generated this project
 * did not have — please run it yourself.
 */
require('dotenv').config();
const supabase = require('../server/supabaseClient');

async function main() {
  console.log('Checking Supabase connection...');
  const testEmail = `healthcheck+${Date.now()}@example.invalid`;

  const { data: inserted, error: insertError } = await supabase
    .from('users')
    .insert({ username: 'healthcheck', email: testEmail, password: 'not-a-real-hash', is_parent: false })
    .select();

  if (insertError) {
    console.error('❌ Could not insert into `users`. Check SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY and that db/schema.sql was run.');
    console.error(insertError);
    process.exit(1);
  }
  console.log('✅ Insert succeeded:', inserted[0].user_id);

  const { data: fetched, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('email', testEmail)
    .limit(1);
  if (fetchError || !fetched.length) {
    console.error('❌ Could not read back the row we just inserted.');
    process.exit(1);
  }
  console.log('✅ Read succeeded');

  const { error: deleteError } = await supabase.from('users').delete().eq('email', testEmail);
  if (deleteError) {
    console.error('⚠️  Cleanup delete failed (not fatal), please remove the test row manually:', testEmail);
  } else {
    console.log('✅ Cleanup succeeded');
  }

  console.log('\nSupabase connection is fully working. 🎉');
}

main().catch((err) => {
  console.error('❌ Unexpected error while checking Supabase:', err);
  process.exit(1);
});
