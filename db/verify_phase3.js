const fetch = globalThis.fetch || require('node-fetch');
const SUPABASE_URL = 'https://rrparmqtkodqinupzwve.supabase.co';
const ANON_KEY = 'sb_publishable_sA_-b_0WcPLSV34NAZzumA_iAhU2LAA';

async function query(table) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`;
  const res = await fetch(url, {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      Accept: 'application/json',
    },
  });
  const text = await res.text();
  console.log(`Table ${table} - Status:`, res.status);
  console.log(`Response:`, text);
}

async function main() {
  console.log('--- Checking Audit Logs ---');
  await query('incident_audit_logs');
  
  console.log('\n--- Checking Evidence ---');
  await query('incident_evidence');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
