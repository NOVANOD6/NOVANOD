import fs from 'node:fs/promises';
import path from 'node:path';

const root = 'artifacts';
const maxBytes = 2_500_000;
const extensions = new Map([['.png','image/png'],['.jpg','image/jpeg'],['.jpeg','image/jpeg'],['.webp','image/webp']]);
async function walk(dir) {
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes:true }); }
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
const evidence = [];
const failures = [];
const output = 'artifacts/audit-evidence.json';
await fs.mkdir(root, { recursive:true });
if (!files.length) {
  await fs.writeFile(output, JSON.stringify({ evidence }, null, 2));
  throw new Error('Aucune capture Playwright ou Lighthouse n’a été générée : les preuves visuelles ne peuvent pas être validées.');
}
const required = ['APPWRITE_ENDPOINT','APPWRITE_PROJECT_ID','APPWRITE_FUNCTION_ID','APPWRITE_API_KEY','NOVA_AUDIT_TOKEN'];
const missing = required.filter(key => !process.env[key]);
if (missing.length) {
  await fs.writeFile(output, JSON.stringify({ evidence }, null, 2));
  throw new Error('Captures non transférées : variables GitHub absentes : ' + missing.join(', '));
}
const endpoint = process.env.APPWRITE_ENDPOINT.replace(/\/$/,'');
const executionUrl = `${endpoint}/functions/${encodeURIComponent(process.env.APPWRITE_FUNCTION_ID)}/executions`;
for (const file of files) {
  const bytes = await fs.readFile(file);
  if (!bytes.length || bytes.length > maxBytes) {
    console.warn(`Capture trop volumineuse, conservée dans l’artefact GitHub : ${file}`);
    continue;
  }
  const relativePath = path.relative(root, file).replaceAll('\\\\','/');
  const payload = {
    action:'upload_audit_artifact',
    auditToken:process.env.NOVA_AUDIT_TOKEN,
    fileName:path.basename(file),
    mimeType:extensions.get(path.extname(file).toLowerCase()),
    base64:bytes.toString('base64'),
    runId:process.env.GITHUB_RUN_ID || '',
    commit:process.env.GITHUB_SHA || '',
    branch:process.env.GITHUB_REF_NAME || '',
    relativePath,
  };
  try {
    const response = await fetch(executionUrl, {
      method:'POST',
      headers:{'Content-Type':'application/json','X-Appwrite-Project':process.env.APPWRITE_PROJECT_ID,'X-Appwrite-Key':process.env.APPWRITE_API_KEY},
      body:JSON.stringify({body:JSON.stringify(payload),async:false,path:'/',method:'POST'}),
    });
    const raw = await response.text();
    if (!response.ok) throw new Error(`Appwrite execution HTTP ${response.status}: ${raw.slice(0,700)}`);
    const execution = JSON.parse(raw);
    if (execution.responseStatusCode < 200 || execution.responseStatusCode >= 300) throw new Error(`Fonction HTTP ${execution.responseStatusCode}: ${(execution.responseBody||'').slice(0,700)}`);
    const result = JSON.parse(execution.responseBody || '{}');
    if (!result.success || !result.fileId) throw new Error('Appwrite n’a pas confirmé le stockage privé.');
    evidence.push({
      fileId:result.fileId,
      bucketId:result.metadata?.bucketId || '',
      fileName:result.metadata?.fileName || path.basename(file),
      mimeType:extensions.get(path.extname(file).toLowerCase()),
      relativePath,
      testTitle:relativePath.includes('test-results/') ? relativePath.split('/')[1] : '',
      project:relativePath.includes('lighthouse-mobile') ? 'Lighthouse mobile' : relativePath.includes('lighthouse-desktop') ? 'Lighthouse ordinateur' : 'Playwright',
      runId:process.env.GITHUB_RUN_ID || '',
    });
    console.log('Capture stockée en privé dans Appwrite Storage : ' + result.fileId);
  } catch (error) {
    failures.push({ relativePath, message:error.message });
    console.warn(`Capture non transférée (${relativePath}) : ${error.message}`);
  }
}
await fs.writeFile(output, JSON.stringify({ evidence, failures }, null, 2));
console.log(`Preuves visuelles transférées : ${evidence.length}/${files.length}.`);
if (failures.length || evidence.length !== files.length) {
  throw new Error(`Stockage des preuves incomplet : ${evidence.length}/${files.length}. Vérifie notamment la variable NOVA_AUDIT_STORAGE_BUCKET_ID dans les variables d’environnement de la fonction Appwrite.`);
}
