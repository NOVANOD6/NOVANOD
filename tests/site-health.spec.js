import { test, expect } from '@playwright/test';

test('la page d’accueil répond sans erreur HTTP', async ({ page }) => {
  const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
  expect(response, 'Aucune réponse HTTP reçue').not.toBeNull();
  expect(response.status(), `HTTP ${response.status()} sur la page d’accueil`).toBeLessThan(400);
  await expect(page.locator('body')).toBeVisible();
});

test('la page ne déborde pas horizontalement sur le viewport testé', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body?.scrollWidth ?? 0,
    title: document.title,
  }));
  expect(dimensions.document, `Débordement horizontal : ${JSON.stringify(dimensions)}`)
    .toBeLessThanOrEqual(dimensions.viewport + 2);
});

test('tous les liens internes restent dans le sous-répertoire GitHub Pages et répondent', async ({ page, request, baseURL }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const base = new URL(baseURL);
  const hrefs = await page.locator('a[href]').evaluateAll(nodes =>
    [...new Set(nodes.map(a => a.href).filter(Boolean))]
      .filter(href => {
        const url = new URL(href, location.href);
        return url.origin === location.origin;
      })
  );

  const failures = [];
  for (const href of hrefs) {
    const url = new URL(href);
    if (!url.pathname.startsWith(base.pathname)) {
      failures.push(`Chemin hors du projet GitHub Pages : ${href} (base : ${base.pathname})`);
      continue;
    }
    const response = await request.get(href, { failOnStatusCode: false, timeout: 15000 });
    if (response.status() >= 400) failures.push(`HTTP ${response.status()} : ${href}`);
  }
  expect(failures, failures.join('\\n')).toEqual([]);
});

test('aucune exception JavaScript non gérée au chargement', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1000);
  expect(pageErrors, pageErrors.join('\\n')).toEqual([]);
});
