// Simple Node script to query Supabase REST for incidents
// Usage: node db/check_supabase.js

const fetch = globalThis.fetch || require('node-fetch');
const SUPABASE_URL = 'https://rrparmqtkodqinupzwve.supabase.co';
const ANON_KEY = 'sb_publishable_sA_-b_0WcPLSV34NAZzumA_iAhU2LAA';

async function main() {
  const url = `${SUPABASE_URL}/rest/v1/incidents?select=*`;
  const res = await fetch(url, {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
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
