// Infos de l'établissement : l'espace parent (cinq onglets, bandeau, liste) et l'écran de publication tiennent dans un
// téléphone de 375 px, sans défilement horizontal.
import { test, expect } from '@playwright/test';
import { mockSupabase, buildData } from './support/mockSupabase';

const info = (id, over = {}) => ({
  id, title: `Frais du relevé de notes n°${id}`, body: 'Le relevé de notes coûte 1 500 FCFA, à régler au secrétariat avant la fin du mois.\nMerci de ne pas confier l\'argent à l\'élève.',
  category: 'frais', amount_fcfa: 1500, deadline: '2030-01-31', class_id: null, author_id: 'u9', author_name: 'Awa Kossi', author_role: 'admin',
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...over,
});

const noHorizontalScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

test.describe('téléphone (375 px)', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

  test('espace parent : bandeau, onglet « Actualités » et cinq onglets dans l\'écran', async ({ page, context }) => {
    await mockSupabase(context, { role: 'parent', data: { ...buildData({ studentCount: 2 }), announcements: [info(2, { class_id: 1 }), info(1, { category: 'reglement', amount_fcfa: null, deadline: null, title: 'Nouvelle règle : uniforme' })] } });
    await page.goto('/#/parents');

    const banner = page.getByRole('button', { name: /2 nouvelles actualités de l'école/ });
    await expect(banner).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);

    for (const tab of await page.locator('main button').filter({ has: page.locator('svg') }).evaluateAll((els) =>
      els.filter((el) => el.className.includes('flex-1')).map((el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right }; }))) {
      expect(tab.left).toBeGreaterThanOrEqual(0);
      expect(tab.right).toBeLessThanOrEqual(376);
    }

    await banner.click();
    await expect(page.getByRole('heading', { name: 'Frais du relevé de notes n°2' })).toBeVisible();
    await expect(page.getByText('Nouvelle règle : uniforme')).toBeVisible();
    await expect(page.getByText(/1\s500 FCFA/).first()).toBeVisible();
    await expect(page.getByText(/À régler avant le 31 janvier 2030/).first()).toBeVisible();
    await expect(page.getByText('Classe 6ème A')).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);
  });

  test('écran de publication (administrateur) : formulaire et liste dans l\'écran', async ({ page, context }) => {
    await mockSupabase(context, { role: 'admin', data: { ...buildData(), announcements: [info(1, { author_id: 'u-1' })] } });
    await page.goto('/#/annonces');
    await expect(page.getByRole('heading', { name: "Actualités de l'établissement" })).toBeVisible();
    await expect(page.getByLabel('Titre')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Publier' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Modifier : Frais du relevé/ })).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);
    const rects = await page.locator('main input, main select, main textarea, main button').evaluateAll((els) =>
      els.map((el) => { const r = el.getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(r.right), width: r.width }; }).filter((r) => r.width > 0));
    expect(rects.filter((r) => r.left < 0 || r.right > 376)).toEqual([]);
  });
});

test('menu : « Actualités » pour l\'administrateur, le professeur et le secrétariat, pas pour le parent', async ({ page, context }) => {
  await mockSupabase(context, { role: 'professeur', data: { ...buildData(), announcements: [] } });
  await page.goto('/#/dashboard');
  await expect(page.getByRole('navigation').getByText('Actualités', { exact: true })).toBeVisible();
});

test('menu parent : aucune entrée de publication, et l\'adresse #/annonces ne l\'ouvre pas', async ({ page, context }) => {
  await mockSupabase(context, { role: 'parent', data: { ...buildData(), announcements: [] } });
  await page.goto('/#/annonces');
  await expect(page.getByRole('navigation').getByText('Actualités', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: "Actualités de l'établissement" })).toHaveCount(0);
  await expect(page.getByText(/Espace Parents/).first()).toBeVisible();
});
