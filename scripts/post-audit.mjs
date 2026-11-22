import fs from 'node:fs';

const required = ['APPWRITE_ENDPOINT','APPWRITE_PROJECT_ID','APPWRITE_FUNCTION_ID','APPWRITE_API_KEY','NOVA_AUDIT_TOKEN'];
for (const key of required) if (!process.env[key]) throw new Error(`Secret GitHub manquant : ${key}`);
const audit = JSON.parse(fs.readFileSync('artifacts/audit-summary.json','utf8'));
try { audit.evidence = JSON.parse(fs.readFileSync('artifacts/audit-evidence.json','utf8')).evidence || []; }
catch { audit.evidence = []; }
const endpoint = process.env.APPWRITE_ENDPOINT.replace(/\/$/,'');
const url = `${endpoint}/functions/${encodeURIComponent(process.env.APPWRITE_FUNCTION_ID)}/executions`;
const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Appwrite-Project': process.env.APPWRITE_PROJECT_ID,
    'X-Appwrite-Key': process.env.APPWRITE_API_KEY,
  },
  body: JSON.stringify({
    body: JSON.stringify({ action: 'ingest_github_audit', auditToken: process.env.NOVA_AUDIT_TOKEN, audit }),
    async: false,
    path: '/',
    method: 'POST',
  }),
});
const text = await response.text();
if (!response.ok) throw new Error(`Appwrite execution HTTP ${response.status}: ${text.slice(0,2000)}`);
let execution;
try { execution = JSON.parse(text); } catch { execution = { raw: text }; }
console.log('Audit envoyé à Appwrite. Execution:', execution.$id || execution.id || 'créée');
if (execution.responseStatusCode && execution.responseStatusCode >= 400) {
  throw new Error(`La fonction a répondu HTTP ${execution.responseStatusCode}: ${(execution.responseBody || '').slice(0,2000)}`);
}
