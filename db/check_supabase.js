// Simple Node script to query Supabase REST for incidents
// Usage:
//   Set SUPABASE_URL and SUPABASE_ANON_KEY (or EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY)
//   node db/check_supabase.js

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
    console.error('  node db/check_supabase.js');
    process.exit(1);
  }

  return { supabaseUrl, anonKey };
}

async function main() {
  const { supabaseUrl, anonKey } = getSupabaseConfig();
  const url = `${supabaseUrl}/rest/v1/incidents?select=*`;
  const res = await fetch(url, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      Accept: 'application/json',
    },
  });
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text);
}

main().catch((err) => {
  console.error('Error querying Supabase:', err);
  process.exit(1);
});
