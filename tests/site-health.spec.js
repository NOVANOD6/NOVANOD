import { test, expect } from '@playwright/test';

test('la page d’accueil répond sans erreur HTTP', async ({ page }) => {
  const response = await page.goto('./', { waitUntil: 'domcontentloaded' });
  expect(response, 'Aucune réponse HTTP reçue').not.toBeNull();
  expect(response.status(), `HTTP ${response.status()} sur la page d’accueil`).toBeLessThan(400);
  await expect(page.locator('body')).toBeVisible();
});

test('la page ne déborde pas horizontalement sur le viewport testé', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body?.scrollWidth ?? 0,
    title: document.title,
  }));
  expect(dimensions.document, `Débordement horizontal : ${JSON.stringify(dimensions)}`)
    .toBeLessThanOrEqual(dimensions.viewport + 2);
});

test('les liens internes visibles ont une destination exploitable', async ({ page, request }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  // GitHub Pages project sites live under /NOVANOD/, not at the origin root.
  const sitePrefix = new URL(process.env.SITE_URL || 'https://novanod6.github.io/NOVANOD/').href;
  const hrefs = await page.locator('a[href]').evaluateAll((nodes, prefix) =>
    [...new Set(nodes.map(a => a.href).filter(Boolean))]
      .filter(href => href.startsWith(prefix))
      .slice(0, 30), sitePrefix
  );
  for (const href of hrefs) {
    const response = await request.get(href, { failOnStatusCode: false, timeout: 15000 });
    expect(response.status(), `Lien interne en erreur : ${href}`).toBeLessThan(400);
  }
});

test('aucune exception JavaScript non gérée au chargement', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1000);
  expect(pageErrors, pageErrors.join('\n')).toEqual([]);
});
    


test('admin : écran de connexion et identité visuelle chargent correctement', async ({ page }) => {
  const response = await page.goto('admin.html', { waitUntil: 'domcontentloaded' });
  expect(response).not.toBeNull();
  expect(response.status()).toBeLessThan(400);
  await expect(page.locator('#screen-login')).toBeVisible();
  await expect(page.locator('.header-brand')).toBeVisible();
  const palette = await page.locator(':root').evaluate(el => {
    const css = getComputedStyle(el);
    return {
      cream: css.getPropertyValue('--cream-bg').trim(),
      burgundy: css.getPropertyValue('--dark-brown').trim(),
    };
  });
  expect(palette.cream.toLowerCase()).toBe('#fffbd0');
  expect(palette.burgundy.toLowerCase()).toBe('#3b1420');
  await page.screenshot({ path: 'artifacts/admin-login.png', fullPage: true });
});

test('admin : contrôles visuels et panneaux Appwrite/IA sont présents', async ({ page }) => {
  await page.goto('admin.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.device-tab[data-device="phone"] svg')).toHaveCount(1);
  await expect(page.locator('.device-tab[data-device="tablet"] svg')).toHaveCount(1);
  await expect(page.locator('.device-tab[data-device="desktop"] svg')).toHaveCount(1);
  await expect(page.locator('#btn-orient-portrait svg')).toHaveCount(1);
  await expect(page.locator('#btn-orient-landscape svg')).toHaveCount(1);
  await expect(page.locator('.analysis-action svg').first()).toHaveCount(1);
  await expect(page.locator('#btn-register-fingerprint .fingerprint-mark')).toHaveCount(1);
  const revealPane = async paneId => page.evaluate(id => {
    document.getElementById('screen-login')?.classList.add('hidden');
    document.getElementById('screen-admin')?.classList.remove('hidden');
    document.querySelectorAll('.dash-pane').forEach(pane => pane.classList.remove('active'));
    document.querySelectorAll('.dash-tabs .dash-tab[data-pane]').forEach(tab => tab.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
    document.querySelector('.dash-tabs .dash-tab[data-pane="'+id+'"]')?.classList.add('active');
  }, paneId);
  await revealPane('pane-preview');
  await page.screenshot({ path: 'artifacts/admin-controls.png', fullPage: true });
  await revealPane('pane-analytics');
  await page.screenshot({ path: 'artifacts/admin-analytics.png', fullPage: true });
  await revealPane('pane-functions');
  await page.screenshot({ path: 'artifacts/admin-appwrite.png', fullPage: true });
  await revealPane('pane-assistant');
  await page.screenshot({ path: 'artifacts/admin-assistant.png', fullPage: true });
  await revealPane('pane-reports');
  await page.screenshot({ path: 'artifacts/admin-reports.png', fullPage: true });
});

test('admin : le JavaScript ne contient pas d’erreur au chargement', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const response = await page.goto('admin.html', { waitUntil: 'domcontentloaded' });
  expect(response).not.toBeNull();
  await page.waitForTimeout(1200);
  expect(errors, errors.join('\\n')).toEqual([]);
});

test('site public : captures des formats téléphone, tablette et ordinateur', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.screenshot({ path: `artifacts/public-${testInfo.project.name}.png`, fullPage: true });
  const size = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(size.document).toBeLessThanOrEqual(size.viewport + 2);
});

test('admin : aucun avertissement Passkey prématuré avant interaction', async ({ page }) => {
  await page.goto('admin.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);
  const messages = await page.evaluate(() => [
    document.querySelector('#login-status')?.textContent || '',
    document.querySelector('#fingerprint-status')?.textContent || '',
    document.querySelector('#passkey-list')?.textContent || '',
  ].join(' '));
  expect(messages).not.toMatch(/aucune (empreinte|passkey)/i);
});

test('admin : les cinq profils IA spécialisés sont disponibles', async ({ page }) => {
  await page.goto('admin.html', { waitUntil: 'domcontentloaded' });
  const roles = page.locator('#assistant-role option');
  await expect(roles).toHaveCount(6);
  await expect(page.locator('#assistant-role')).toContainText('Expert Appwrite');
  await expect(page.locator('#assistant-role')).toContainText('Expert Performance');
  await expect(page.locator('#assistant-role')).toContainText('Expert Accessibilité');
  await expect(page.locator('#assistant-role')).toContainText('Expert SEO');
  await expect(page.locator('#assistant-role')).toContainText('Expert DevOps');
});

test('admin : les rapports tabulaires restent lisibles sur un écran mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('admin.html', { waitUntil: 'domcontentloaded' });
  const metrics = await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.className = 'report-document';
    probe.style.width = '100%';
    probe.innerHTML = '<div class="report-table-scroll"><table class="report-structured-table"><thead><tr><th>Rubrique</th><th>Constat</th></tr></thead><tbody><tr><th>Performance mobile</th><td>Le temps de chargement doit être amélioré sans couper les mots ni faire déborder la page.</td></tr><tr><th>Accessibilité</th><td>Les contrôles doivent conserver un contraste suffisant et rester utilisables au clavier.</td></tr></tbody></table></div>';
    document.body.appendChild(probe);
    const table = probe.querySelector('table');
    const cell = probe.querySelector('td');
    const result = {
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      report: probe.scrollWidth,
      reportClient: probe.clientWidth,
      display: getComputedStyle(table).display,
      wordBreak: getComputedStyle(cell).wordBreak,
      overflowWrap: getComputedStyle(cell).overflowWrap,
    };
    probe.remove();
    return result;
  });
  expect(metrics.document, JSON.stringify(metrics)).toBeLessThanOrEqual(metrics.viewport + 2);
  expect(metrics.report, JSON.stringify(metrics)).toBeLessThanOrEqual(metrics.reportClient + 2);
  expect(metrics.wordBreak).toBe('normal');
  expect(metrics.overflowWrap).toBe('break-word');
  await page.evaluate(() => {
    document.getElementById('screen-login')?.classList.add('hidden');
    document.getElementById('screen-admin')?.classList.remove('hidden');
    document.querySelectorAll('.dash-pane').forEach(pane => pane.classList.remove('active'));
    document.querySelectorAll('.dash-tabs .dash-tab[data-pane]').forEach(tab => tab.classList.remove('active'));
    document.getElementById('pane-reports')?.classList.add('active');
    document.querySelector('.dash-tabs .dash-tab[data-pane="pane-reports"]')?.classList.add('active');
    const host = document.getElementById('analysis-history');
    if (host) host.innerHTML = '<article class="report-card"><div class="report-card-head">Rapport mobile · preuve d’affichage</div><div class="report-document"><div class="report-table-scroll"><table class="report-structured-table"><thead><tr><th>Rubrique</th><th>Constat</th></tr></thead><tbody><tr><th>Performance mobile</th><td>Le temps de chargement doit être amélioré sans couper les mots ni faire déborder la page.</td></tr><tr><th>Accessibilité</th><td>Les contrôles doivent conserver un contraste suffisant et rester utilisables au clavier.</td></tr></tbody></table></div></div></article>';
  });
  await page.screenshot({ path: 'artifacts/admin-reports-mobile.png', fullPage: true });
});
