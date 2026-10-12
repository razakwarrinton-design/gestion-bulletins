// Téléphone (375 px) : les parents et le personnel utilisent surtout leur téléphone. Ces contrôles ont révélé qu'une
// page de connexion dont le formulaire sortait de l'écran était inutilisable.
import { test, expect } from '@playwright/test';
import { mockSupabase, buildData } from './support/mockSupabase';

test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

const horizontalScroll = (page) => page.evaluate(() => ({
  scroll: document.documentElement.scrollWidth,
  client: document.documentElement.clientWidth,
}));

test('la page de connexion est utilisable : le formulaire reste dans l\'écran', async ({ page }) => {
  await page.goto('/');
  const email = page.getByPlaceholder('votre@email.com');
  await expect(email).toBeVisible();
  const submit = page.getByRole('button', { name: /Se connecter/ }).last();
  for (const field of [email, page.locator('input[type="password"]'), submit]) {
    const box = await field.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(375);
  }
  const { scroll, client } = await horizontalScroll(page);
  expect(scroll).toBeLessThanOrEqual(client);
});

for (const [kind, title] of [['confidentialite', 'Politique de confidentialité'], ['conditions', "Conditions d'utilisation"]]) {
  test(`page légale « ${title} » lisible sans défilement horizontal`, async ({ page }) => {
    await page.goto(`/#/${kind}`);
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    const { scroll, client } = await horizontalScroll(page);
    expect(scroll).toBeLessThanOrEqual(client);
  });
}

test('espace parents (le compte du parent, avec son enfant) : lisible sans défilement horizontal', async ({ page, context }) => {
  const unexpected = await mockSupabase(context, { role: 'parent', data: buildData({ subjectCount: 8 }) });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/#/parents');
  await expect(page.getByText(/1 élève suivi/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Moyenne/).first()).toBeVisible();
  const { scroll, client } = await horizontalScroll(page);
  expect(scroll).toBeLessThanOrEqual(client);
  expect(errors).toEqual([]);
  expect(unexpected).toEqual([]);
});

const VIEWS = [
  'dashboard', 'classes', 'students', 'subjects', 'grades', 'absences', 'bulletins', 'academicyears', 'appreciations',
  'analytics', 'statistics', 'ia-appreciations', 'importexport', 'gestion-parents', 'admin-payments', 'users', 'audit',
  'settings', 'chat',
];

test('écrans de l\'administrateur : aucun défilement horizontal de la page, aucune erreur', async ({ page, context }) => {
  const unexpected = await mockSupabase(context, { role: 'admin' });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/#/dashboard');
  await expect(page.getByRole('heading', { name: 'Tableau de bord' }).first()).toBeVisible();

  const overflowing = [];
  for (const view of VIEWS) {
    await page.evaluate((v) => { window.location.hash = `#/${v}`; }, view);
    await expect(page).toHaveURL(new RegExp(`#/${view}$`));
    await page.waitForTimeout(700); // laisse l'écran (chargé à la demande) s'afficher
    const { scroll, client } = await horizontalScroll(page);
    if (scroll > client) overflowing.push(`${view} (${scroll} > ${client})`);
  }
  expect(overflowing).toEqual([]);
  expect(errors).toEqual([]);
  expect(unexpected).toEqual([]);
});
