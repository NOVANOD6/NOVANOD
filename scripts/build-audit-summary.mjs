import fs from 'node:fs';

const readJson = path => {
  try { return JSON.parse(fs.readFileSync(path, 'utf8')); }
  catch { return null; }
};
const score = (report, key) => {
  const value = report?.categories?.[key]?.score;
  return Number.isFinite(value) ? Math.round(value * 100) : null;
};
const metrics = report => {
  const ids = ['first-contentful-paint','largest-contentful-paint','total-blocking-time','cumulative-layout-shift','speed-index','interactive'];
  return Object.fromEntries(ids.map(id => [id, report?.audits?.[id]?.displayValue || report?.audits?.[id]?.numericValue || null]));
};
const pw = readJson('artifacts/playwright-results.json');
const lhMobile = readJson('artifacts/lighthouse-mobile.json');
const lhDesktop = readJson('artifacts/lighthouse-desktop.json');
const pageReports = {
  privacy: {
    mobile: readJson('artifacts/lighthouse-privacy-mobile.json'),
    desktop: readJson('artifacts/lighthouse-privacy-desktop.json'),
  },
  terms: {
    mobile: readJson('artifacts/lighthouse-terms-mobile.json'),
    desktop: readJson('artifacts/lighthouse-terms-desktop.json'),
  },
};
const pageSummary = report => report ? {
  scores: { performance: score(report,'performance'), accessibility: score(report,'accessibility'), bestPractices: score(report,'best-practices'), seo: score(report,'seo') },
  metrics: metrics(report), url: report.finalDisplayedUrl,
} : null;

function saveFinalScreenshot(report, fileName) {
  const data = report?.audits?.['final-screenshot']?.details?.data;
  const match = typeof data === 'string' ? data.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/) : null;
  if (!match) return null;
  const extension = match[1] === 'jpeg' ? 'jpg' : match[1];
  const output = `artifacts/${fileName}.${extension}`;
  fs.mkdirSync('artifacts', { recursive:true });
  fs.writeFileSync(output, Buffer.from(match[2], 'base64'));
  return output;
}
const lighthouseScreenshots = [
  saveFinalScreenshot(lhMobile, 'lighthouse-mobile-final'),
  saveFinalScreenshot(lhDesktop, 'lighthouse-desktop-final'),
  saveFinalScreenshot(pageReports.privacy.mobile, 'lighthouse-privacy-mobile-final'),
  saveFinalScreenshot(pageReports.privacy.desktop, 'lighthouse-privacy-desktop-final'),
  saveFinalScreenshot(pageReports.terms.mobile, 'lighthouse-terms-mobile-final'),
  saveFinalScreenshot(pageReports.terms.desktop, 'lighthouse-terms-desktop-final'),
].filter(Boolean);
const tests = [];
function walk(suites = []) {
  for (const suite of suites) {
    for (const spec of suite.specs || []) for (const test of spec.tests || []) {
      const result = test.results?.at(-1) || {};
      tests.push({ title: spec.title, project: test.projectName, status: result.status || test.status || 'unknown', durationMs: result.duration || 0, error: result.error?.message || result.errors?.[0]?.message || null });
    }
    walk(suite.suites || []);
  }
}
walk(pw?.suites || []);
const summary = {
  runId: process.env.GITHUB_RUN_ID || '',
  commit: process.env.GITHUB_SHA || '',
  branch: process.env.GITHUB_REF_NAME || '',
  siteUrl: process.env.SITE_URL || 'https://novanod6.github.io/NOVANOD/',
  generatedAt: new Date().toISOString(),
  lighthouseScreenshots,
  playwright: {
    total: tests.length,
    passed: tests.filter(t => t.status === 'passed').length,
    failed: tests.filter(t => t.status === 'failed' || t.status === 'timedOut').length,
    skipped: tests.filter(t => t.status === 'skipped').length,
    tests,
  },
  lighthouse: {
    mobile: lhMobile ? { scores: { performance: score(lhMobile,'performance'), accessibility: score(lhMobile,'accessibility'), bestPractices: score(lhMobile,'best-practices'), seo: score(lhMobile,'seo') }, metrics: metrics(lhMobile), url: lhMobile.finalDisplayedUrl } : null,
    desktop: lhDesktop ? { scores: { performance: score(lhDesktop,'performance'), accessibility: score(lhDesktop,'accessibility'), bestPractices: score(lhDesktop,'best-practices'), seo: score(lhDesktop,'seo') }, metrics: metrics(lhDesktop), url: lhDesktop.finalDisplayedUrl } : null,
    pages: {
      privacy: { mobile: pageSummary(pageReports.privacy.mobile), desktop: pageSummary(pageReports.privacy.desktop) },
      terms: { mobile: pageSummary(pageReports.terms.mobile), desktop: pageSummary(pageReports.terms.desktop) },
    },
  },
};
summary.summary = `Playwright: ${summary.playwright.passed}/${summary.playwright.total} réussis, ${summary.playwright.failed} échec(s). Accueil mobile: ${JSON.stringify(summary.lighthouse.mobile?.scores || 'indisponible')}. Confidentialité mobile: ${JSON.stringify(summary.lighthouse.pages.privacy.mobile?.scores || 'indisponible')}. Conditions mobile: ${JSON.stringify(summary.lighthouse.pages.terms.mobile?.scores || 'indisponible')}.`;
fs.writeFileSync('artifacts/audit-summary.json', JSON.stringify(summary, null, 2));
console.log(summary.summary);
