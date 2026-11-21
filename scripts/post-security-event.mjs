import fs from 'node:fs/promises';

const reportPath = 'artifacts/npm-audit.json';
let report;
try { report = JSON.parse(await fs.readFile(reportPath, 'utf8')); }
catch (error) { throw new Error(`Rapport npm audit absent ou illisible : ${error.message}`); }
const counts = report.metadata?.vulnerabilities || {};
const high = Number(counts.high || 0);
const critical = Number(counts.critical || 0);
if (high + critical === 0) {
  console.log(`Aucune vulnérabilité npm élevée ou critique détectée (total signalé : ${Number(counts.total || 0)}).`);
  process.exit(0);
}
const token = process.env.NOVA_SECURITY_ALERT_TOKEN;
const required = ['APPWRITE_ENDPOINT','APPWRITE_PROJECT_ID','APPWRITE_FUNCTION_ID','APPWRITE_API_KEY'];
for (const key of required) if (!process.env[key]) throw new Error(`Secret GitHub manquant : ${key}`);
if (!token) throw new Error('Secret GitHub NOVA_SECURITY_ALERT_TOKEN manquant : impossible d’envoyer l’alerte.');
const packages = Object.entries(report.vulnerabilities || {}).slice(0, 30).map(([name, item]) => {
  const via = (item.via || []).map(v => typeof v === 'string' ? v : v.title || v.name || 'avis sans titre');
  return `${name}: ${item.severity || 'inconnue'}${via.length ? ` (${via.join('; ')})` : ''}`;
}).join('\n').slice(0, 3400);
const event = {
  severity: critical > 0 ? 'critical' : 'high',
  source: 'GitHub Actions · npm audit',
  event: 'Dépendances présentant des vulnérabilités élevées ou critiques',
  summary: `${critical} vulnérabilité(s) critique(s) et ${high} vulnérabilité(s) élevée(s) détectée(s) dans les dépendances analysées.`,
  details: packages || 'Le rapport npm audit contient des vulnérabilités élevées ou critiques.',
  reference: `GitHub run ${process.env.GITHUB_RUN_ID || 'inconnu'} · commit ${(process.env.GITHUB_SHA || '').slice(0, 12)}`,
};
const endpoint = process.env.APPWRITE_ENDPOINT.replace(/\/$/,'');
const response = await fetch(`${endpoint}/functions/${encodeURIComponent(process.env.APPWRITE_FUNCTION_ID)}/executions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Appwrite-Project': process.env.APPWRITE_PROJECT_ID, 'X-Appwrite-Key': process.env.APPWRITE_API_KEY },
  body: JSON.stringify({ body: JSON.stringify({ action: 'ingest_security_event', alertToken: token, event }), async: false, path: '/', method: 'POST' }),
});
const raw = await response.text();
if (!response.ok) throw new Error(`Appwrite execution HTTP ${response.status}: ${raw.slice(0,1500)}`);
let execution;
try { execution = JSON.parse(raw); } catch { throw new Error(`Réponse Appwrite illisible : ${raw.slice(0,1000)}`); }
if (Number(execution.responseStatusCode) < 200 || Number(execution.responseStatusCode) >= 300) {
  throw new Error(`Ingestion alerte refusée (fonction HTTP ${execution.responseStatusCode}) : ${(execution.responseBody || '').slice(0,1500)}`);
}
let result = {};
try { result = JSON.parse(execution.responseBody || '{}'); } catch {}
if (!result.persisted || !result.eventId) throw new Error('Appwrite n’a pas confirmé l’enregistrement de l’incident.');
console.log(`Alerte de sécurité enregistrée : ${result.eventId}. Push accepté=${!!result.channels?.push?.acceptedByAppwrite}; e-mail accepté=${!!result.channels?.email?.acceptedByAppwrite}.`);
