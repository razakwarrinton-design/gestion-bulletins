// Impression réelle des bulletins : l'application ouvre la fenêtre d'impression, on récupère son contenu et on le
// transforme en PDF A4 avec le moteur du navigateur. Un bulletin doit tenir sur une page, avec 8 comme avec 14 matières.
import { test, expect } from '@playwright/test';
import { mockSupabase, buildData } from './support/mockSupabase';

const pageCount = (pdf) => (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;

/** Ouvre #/bulletins, choisit la classe, clique sur `trigger`, renvoie le HTML écrit dans la fenêtre d'impression. */
async function printedHtml(page, context, trigger) {
  const popupPromise = page.waitForEvent('popup');
  await trigger();
  const popup = await popupPromise;
  await popup.waitForLoadState('domcontentloaded');
  return popup.content(); // lu tout de suite : la fenêtre se ferme d'elle-même après l'impression
}

async function toPdf(context, html, options) {
  const blank = await context.newPage();
  await blank.setContent(html);
  const pdf = await blank.pdf({ printBackground: true, preferCSSPageSize: true, ...options });
  await blank.close();
  return pdf;
}

async function openBulletins(page) {
  await page.goto('/#/bulletins');
  await page.getByRole('combobox').first().selectOption('1');
  await expect(page.getByRole('button', { name: /Imprimer PDF/ }).first()).toBeVisible();
}

for (const subjectCount of [8, 14]) {
  test.describe(`${subjectCount} matières`, () => {
    for (const [index, name] of ['Officiel', 'Moderne', 'Premium'].entries()) {
      test(`modèle ${name} : une seule page A4, légende du barème présente`, async ({ page, context }) => {
        await mockSupabase(context, { data: buildData({ subjectCount, studentCount: 6 }) });
        await openBulletins(page);
        await page.getByRole('button', { name: /Imprimer PDF/ }).first().click();
        const html = await printedHtml(page, context, () => page.getByRole('button', { name: /Imprimer ce modèle/ }).nth(index).click());
        expect(html).toContain('Content-Security-Policy');
        expect(html).toMatch(/Excellent ≥ 18/);
        const pdf = await toPdf(context, html);
        expect(pageCount(pdf)).toBe(1);
      });
    }
  });
}

test('tableau récapitulatif de la classe : une page A4 paysage', async ({ page, context }) => {
  await mockSupabase(context, { data: buildData({ subjectCount: 8, studentCount: 25 }) });
  await openBulletins(page);
  const html = await printedHtml(page, context, () => page.getByRole('button', { name: /tableau récapitulatif/i }).click());
  expect(html).toContain('Tableau récapitulatif');
  expect(html).toContain('A4 landscape');
  const pdf = await toPdf(context, html);
  expect(pageCount(pdf)).toBe(1);
});
