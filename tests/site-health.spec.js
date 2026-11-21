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

test('les liens internes visibles ont une destination exploitable', async ({ page, request, baseURL }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const hrefs = await page.locator('a[href]').evaluateAll(nodes =>
    [...new Set(nodes.map(a => a.href).filter(Boolean))]
      .filter(href => href.startsWith(new URL(baseURL).origin + new URL(baseURL).pathname))
      .slice(0, 30)
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

test('admin : contrôles visuels appareil et analyses sont présents sans pictogrammes textuels', async ({ page }) => {
  await page.goto('admin.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.device-tab[data-device="phone"] svg')).toHaveCount(1);
  await expect(page.locator('.device-tab[data-device="tablet"] svg')).toHaveCount(1);
  await expect(page.locator('.device-tab[data-device="desktop"] svg')).toHaveCount(1);
  await expect(page.locator('#btn-orient-portrait svg')).toHaveCount(1);
  await expect(page.locator('#btn-orient-landscape svg')).toHaveCount(1);
  await expect(page.locator('.analysis-action svg').first()).toHaveCount(1);
  await expect(page.locator('#btn-register-fingerprint .fingerprint-mark')).toHaveCount(1);
  await page.screenshot({ path: 'artifacts/admin-controls.png', fullPage: true });
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
