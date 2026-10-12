// Impression réelle des bulletins : l'application ouvre la fenêtre d'impression, on récupère son contenu et on le
// transforme en PDF A4 avec le moteur du navigateur.
//
// Ce qui est garanti, et ce que ces tests mesurent :
//   - de 8 à 14 matières, avec des appréciations de quelques mots par matière (au plus deux lignes dans la colonne) :
//     UNE page A4 ;
//   - textes très longs (appréciations de plusieurs lignes, noms de matière interminables) : rien n'est coupé ni
//     recouvert, mais le bulletin peut s'étendre sur plusieurs pages plutôt que de rogner ce que l'école a écrit.
import { test, expect } from '@playwright/test';
import { mockSupabase, buildData } from './support/mockSupabase';

const pageCount = (pdf) => (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
const MODELS = ['Officiel', 'Moderne', 'Premium'];
const A4_HEIGHT_PX = 1123; // 297 mm à 96 dpi

/** Ouvre #/bulletins, choisit la classe ; renvoie le HTML écrit dans la fenêtre d'impression quand on clique sur `trigger`. */
async function printedHtml(page, trigger) {
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

/** Bulletin du premier élève dans le modèle `index` (0 à 2), avec une appréciation du conseil de classe facultative. */
async function printModel(page, index, councilText = '') {
  await page.getByRole('button', { name: /Imprimer PDF/ }).first().click();
  if (councilText) await page.getByPlaceholder(/Bon trimestre/).fill(councilText);
  return printedHtml(page, () => page.getByRole('button', { name: /Imprimer ce modèle/ }).nth(index).click());
}

/**
 * Ce qui est réellement coupé ou recouvert dans le document (et pas seulement le nombre de pages) :
 *  - un élément à `overflow` caché dont un élément enfant dépasse du cadre (contenu rogné) ;
 *  - une cellule de tableau dont le texte dépasse sa largeur (il recouvrirait la colonne voisine).
 * Les décorations (cercles en pseudo-élément) ne comptent pas : elles n'ont pas de contenu.
 */
async function layoutProblems(context, html) {
  const blank = await context.newPage();
  await blank.setContent(html);
  const result = await blank.evaluate(() => {
    const label = (el) => `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} « ${el.textContent.trim().slice(0, 30)} »`;
    const clipped = [];
    for (const el of document.querySelectorAll('body *')) {
      const style = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      if (box.width === 0) continue;
      if (style.overflow !== 'visible' || style.overflowX !== 'visible' || style.overflowY !== 'visible') {
        const spills = [...el.querySelectorAll('*')].some((child) => {
          const r = child.getBoundingClientRect();
          return r.width > 0 && (r.right > box.right + 1 || r.bottom > box.bottom + 1);
        });
        if (spills) clipped.push(`${label(el)} : un contenu dépasse du cadre`);
      }
      if ((el.tagName === 'TD' || el.tagName === 'TH') && el.scrollWidth > el.clientWidth + 1) {
        clipped.push(`${label(el)} : texte plus large que la cellule (${el.scrollWidth} > ${el.clientWidth})`);
      }
    }
    return { clipped, docHeight: document.documentElement.scrollHeight };
  });
  await blank.close();
  return result;
}

// 11 matières : le cas qui a révélé qu'un modèle dépassait la page juste avant son seuil de mise en page compacte
for (const subjectCount of [8, 11, 14]) {
  test.describe(`${subjectCount} matières, textes ordinaires`, () => {
    for (const [index, name] of MODELS.entries()) {
      test(`modèle ${name} : une seule page A4, légende du barème présente`, async ({ page, context }) => {
        await mockSupabase(context, { data: buildData({ subjectCount, studentCount: 6 }) });
        await openBulletins(page);
        const html = await printModel(page, index);
        expect(html).toContain('Content-Security-Policy');
        expect(html).toMatch(/Excellent ≥ 18/);
        expect((await layoutProblems(context, html)).clipped).toEqual([]);
        expect(pageCount(await toPdf(context, html))).toBe(1);
      });
    }
  });

  // Quelques mots d'appréciation par matière et un avis du conseil de classe de deux lignes : usage courant
  test.describe(`${subjectCount} matières, appréciations courtes`, () => {
    for (const [index, name] of MODELS.entries()) {
      test(`modèle ${name} : une seule page, rien de coupé`, async ({ page, context }) => {
        await mockSupabase(context, { data: buildData({ subjectCount, studentCount: 6, text: 'typical' }) });
        await openBulletins(page);
        const html = await printModel(page, index, 'Trimestre satisfaisant, à poursuivre avec le même sérieux au prochain trimestre.');
        expect((await layoutProblems(context, html)).clipped).toEqual([]);
        expect(pageCount(await toPdf(context, html))).toBe(1);
      });
    }
  });

  // Pire cas : on ne garantit pas une page, on garantit qu'aucun texte n'est perdu
  test.describe(`${subjectCount} matières, textes très longs`, () => {
    for (const [index, name] of MODELS.entries()) {
      test(`modèle ${name} : rien de coupé, trois pages au plus`, async ({ page, context }) => {
        await mockSupabase(context, { data: buildData({ subjectCount, studentCount: 6, text: 'long' }) });
        await openBulletins(page);
        const council = 'Trimestre globalement satisfaisant. '.repeat(11).slice(0, 400);
        const html = await printModel(page, index, council);
        expect(html).toContain('Trimestre globalement satisfaisant.');
        expect(html).toContain('enseignement approfondi et complémentaire');

        const layout = await layoutProblems(context, html);
        expect(layout.clipped).toEqual([]);
        const pages = pageCount(await toPdf(context, html));
        expect(pages).toBeLessThanOrEqual(3);
        // un document de plus d'une page doit réellement s'étendre sur la suivante, pas une feuille presque vide
        if (pages >= 2) expect(layout.docHeight).toBeGreaterThan(A4_HEIGHT_PX * (pages - 1));
      });
    }
  });
}

test('tableau récapitulatif de la classe : une page A4 paysage', async ({ page, context }) => {
  await mockSupabase(context, { data: buildData({ subjectCount: 8, studentCount: 25 }) });
  await openBulletins(page);
  const html = await printedHtml(page, () => page.getByRole('button', { name: /tableau récapitulatif/i }).click());
  expect(html).toContain('Tableau récapitulatif');
  expect(html).toContain('A4 landscape');
  expect((await layoutProblems(context, html)).clipped).toEqual([]);
  expect(pageCount(await toPdf(context, html))).toBe(1);
});
