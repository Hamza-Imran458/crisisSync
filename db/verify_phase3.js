// Verify phase 3 tables (audit logs and evidence) via Supabase REST
// Usage:
//   Set SUPABASE_URL and SUPABASE_ANON_KEY (or EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY)
//   node db/verify_phase3.js

const fetch = globalThis.fetch || require('node-fetch');

function getSupabaseConfig() {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    console.error('Missing Supabase configuration for this script.');
    console.error('');
    console.error('Set these environment variables before running:');
    console.error('  SUPABASE_URL          (or EXPO_PUBLIC_SUPABASE_URL)');
    console.error('  SUPABASE_ANON_KEY     (or EXPO_PUBLIC_SUPABASE_ANON_KEY)');
    console.error('');
    console.error('PowerShell example:');
    console.error('  $env:SUPABASE_URL = "https://your-project.supabase.co"');
    console.error('  $env:SUPABASE_ANON_KEY = "your-anon-key"');
    console.error('  node db/verify_phase3.js');
    process.exit(1);
  }

  return { supabaseUrl, anonKey };
}

async function query(table, supabaseUrl, anonKey) {
  const url = `${supabaseUrl}/rest/v1/${table}?select=*&limit=1`;
  const res = await fetch(url, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      Accept: 'application/json',
    },
  });
  const text = await res.text();
  console.log(`Table ${table} - Status:`, res.status);
  console.log(`Response:`, text);
}

async function main() {
  const { supabaseUrl, anonKey } = getSupabaseConfig();

  console.log('--- Checking Audit Logs ---');
  await query('incident_audit_logs', supabaseUrl, anonKey);

  console.log('\n--- Checking Evidence ---');
  await query('incident_evidence', supabaseUrl, anonKey);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
