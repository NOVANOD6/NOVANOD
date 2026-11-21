import fs from 'node:fs/promises';
import path from 'node:path';

const root = 'artifacts/test-results';
const maxBytes = 2_500_000;
const extensions = new Map([['.png','image/png'],['.jpg','image/jpeg'],['.jpeg','image/jpeg'],['.webp','image/webp']]);
async function walk(dir) {
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}
const files = (await walk(root)).filter(file => extensions.has(path.extname(file).toLowerCase()));
if (!files.length) {
  console.log('Aucune capture image Playwright à transférer. Les artefacts GitHub restent publiés séparément.');
  process.exit(0);
}
const required = ['APPWRITE_ENDPOINT','APPWRITE_PROJECT_ID','APPWRITE_FUNCTION_ID','APPWRITE_API_KEY','NOVA_AUDIT_TOKEN'];
for (const key of required) if (!process.env[key]) throw new Error(`Secret GitHub manquant : ${key}`);
const endpoint = process.env.APPWRITE_ENDPOINT.replace(/\/$/,'');
const executionUrl = `${endpoint}/functions/${encodeURIComponent(process.env.APPWRITE_FUNCTION_ID)}/executions`;
let uploaded = 0;
let skipped = 0;
for (const file of files) {
  const bytes = await fs.readFile(file);
  if (!bytes.length || bytes.length > maxBytes) {
    console.warn(`Capture conservée dans GitHub mais non transférée (limite 2,5 Mo) : ${file}`);
    skipped++;
    continue;
  }
  const payload = {
    action: 'upload_audit_artifact',
    auditToken: process.env.NOVA_AUDIT_TOKEN,
    fileName: path.basename(file),
    mimeType: extensions.get(path.extname(file).toLowerCase()),
    base64: bytes.toString('base64'),
    runId: process.env.GITHUB_RUN_ID || '',
    commit: process.env.GITHUB_SHA || '',
    branch: process.env.GITHUB_REF_NAME || '',
  };
  const response = await fetch(executionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Appwrite-Project': process.env.APPWRITE_PROJECT_ID,
      'X-Appwrite-Key': process.env.APPWRITE_API_KEY,
    },
    body: JSON.stringify({ body: JSON.stringify(payload), async: false, path: '/', method: 'POST' }),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`Appwrite execution HTTP ${response.status}: ${raw.slice(0,1500)}`);
  let execution;
  try { execution = JSON.parse(raw); } catch { throw new Error(`Réponse Appwrite illisible : ${raw.slice(0,1000)}`); }
  if (Number(execution.responseStatusCode) < 200 || Number(execution.responseStatusCode) >= 300) {
    throw new Error(`Échec upload ${file} (fonction HTTP ${execution.responseStatusCode}) : ${(execution.responseBody || '').slice(0,1500)}`);
  }
  let result = {};
  try { result = JSON.parse(execution.responseBody || '{}'); } catch {}
  if (!result.success || !result.fileId) throw new Error(`Appwrite n'a pas confirmé le stockage privé de ${file}.`);
  uploaded++;
  console.log(`Capture stockée dans Appwrite Storage : ${result.fileId}`);
}
console.log(`Transfert terminé : ${uploaded} capture(s) stockée(s), ${skipped} conservée(s) uniquement dans GitHub.`);
