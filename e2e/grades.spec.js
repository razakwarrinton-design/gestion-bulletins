// Saisie des notes : la vue « cartes » ne doit plus dépasser de l'écran d'un téléphone (la fin des cartes était
// rognée), et la vue « tableau » doit permettre de saisir toute une classe.
import { test, expect } from '@playwright/test';
import { mockSupabase, buildData } from './support/mockSupabase';

async function openGrades(page, context, studentCount) {
  await mockSupabase(context, { data: buildData({ subjectCount: 6, studentCount }) });
  await page.goto('/#/grades');
  await page.getByRole('combobox').first().selectOption('1');
}

test.describe('téléphone (375 px)', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

  test('vue cartes : tous les champs de saisie restent dans l\'écran', async ({ page, context }) => {
    await openGrades(page, context, 4);
    await expect(page.getByRole('button', { name: 'Cartes' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('Mathématiques').first()).toBeVisible();

    const rects = await page.locator('main input, main button, main select').evaluateAll((inputs) =>
      inputs.map((el) => { const r = el.getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(r.right), width: r.width }; })
        .filter((r) => r.width > 0));
    expect(rects.length).toBeGreaterThan(10);
    expect(rects.filter((r) => r.left < 0 || r.right > 376)).toEqual([]);
    // le titre ne s'étale pas sur trois lignes
    const title = await page.getByRole('heading', { name: /Saisie des notes/ }).boundingBox();
    expect(title.height).toBeLessThan(40);
  });

  test('vue tableau : défile horizontalement dans son cadre, le nom de l\'élève reste visible', async ({ page, context }) => {
    await openGrades(page, context, 12); // plus de 10 élèves : tableau par défaut
    const table = page.getByRole('table');
    await expect(table).toBeVisible();
    const { pageScroll, pageClient } = await page.evaluate(() => ({
      pageScroll: document.documentElement.scrollWidth, pageClient: document.documentElement.clientWidth,
    }));
    expect(pageScroll).toBeLessThanOrEqual(pageClient);

    const wrapper = table.locator('xpath=..');
    expect(await wrapper.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true); // 6 matières ne tiennent pas : cadre défilable
    await wrapper.evaluate((el) => { el.scrollLeft = el.scrollWidth; });
    const name = page.getByRole('rowheader', { name: /Nom1 Prénom1/ });
    const box = await name.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0); // collé à gauche malgré le défilement
    expect(box.x + box.width).toBeLessThanOrEqual(376);
  });
});

test('vue tableau (ordinateur) : saisir une note l\'enregistre, Entrée passe à l\'élève suivant', async ({ page, context }) => {
  await openGrades(page, context, 12);
  const first = page.getByLabel('Prénom1 Nom1, Mathématiques');
  const second = page.getByLabel('Prénom2 Nom2, Mathématiques');

  const saved = page.waitForRequest((request) => /rest\/v1\/grades/.test(request.url()) && ['POST', 'PATCH', 'PUT'].includes(request.method()));
  await first.fill('17.5');
  await first.press('Enter');
  await expect(second).toBeFocused();
  const request = await saved;
  expect(request.postData()).toContain('17.5');
});

test('menu de l\'administrateur : les rubriques secondaires démarrent repliées et se déplient', async ({ page, context }) => {
  await mockSupabase(context, { role: 'admin' });
  await page.goto('/#/dashboard');
  const nav = page.getByRole('navigation');
  await expect(nav.getByRole('button', { name: 'Avancé' })).toHaveAttribute('aria-expanded', 'false');
  await expect(nav.getByText('Journal d\'audit')).toBeHidden();
  await nav.getByRole('button', { name: 'Gestion' }).click();
  await expect(nav.getByText('Journal d\'audit')).toBeVisible();
});
