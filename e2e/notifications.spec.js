// Cloche de notifications d'un parent : visible dans la barre du haut sans la faire déborder, liste lisible sur un
// téléphone de 375 px, un clic marque la notification comme lue.
import { test, expect } from '@playwright/test';
import { mockSupabase, buildData } from './support/mockSupabase';

const notification = (id, over = {}) => ({
  id, title: 'Notes du 1er trimestre disponibles', body: `Les notes du 1er trimestre de Prénom${id} sont disponibles.`,
  link_view: 'parents', created_at: new Date(Date.now() - 5 * 60000).toISOString(), read_at: null, ...over,
});

async function openAsParent(page, context, notifications) {
  await mockSupabase(context, { role: 'parent', data: { ...buildData({ studentCount: 2 }), notifications } });
  await page.goto('/#/parents');
}

test.describe('téléphone (375 px)', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

  test('la cloche affiche le nombre de non lues, la barre et la liste restent dans l\'écran', async ({ page, context }) => {
    await openAsParent(page, context, [notification(2), notification(1, { read_at: new Date().toISOString() })]);
    const bell = page.getByRole('button', { name: 'Notifications, 1 non lue' });
    await expect(bell).toBeVisible();

    const { pageScroll, pageClient } = await page.evaluate(() => ({ pageScroll: document.documentElement.scrollWidth, pageClient: document.documentElement.clientWidth }));
    expect(pageScroll).toBeLessThanOrEqual(pageClient);
    const header = await page.locator('header').boundingBox();
    const box = await bell.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(header.x + header.width);

    await bell.click();
    const panel = page.getByRole('dialog', { name: 'Notifications' });
    await expect(panel).toBeVisible();
    const p = await panel.boundingBox();
    expect(p.x).toBeGreaterThanOrEqual(0);
    expect(p.x + p.width).toBeLessThanOrEqual(376);
    await expect(panel.getByText('Les notes du 1er trimestre de Prénom2 sont disponibles.')).toBeVisible();
  });

  test('cliquer une notification la marque comme lue (enregistré en base)', async ({ page, context }) => {
    await openAsParent(page, context, [notification(2)]);
    await page.getByRole('button', { name: 'Notifications, 1 non lue' }).click();
    const saved = page.waitForRequest((r) => /rest\/v1\/notifications/.test(r.url()) && r.method() === 'PATCH');
    await page.getByText('Les notes du 1er trimestre de Prénom2 sont disponibles.').click();
    expect((await saved).postData()).toContain('read_at');
    await expect(page.getByRole('button', { name: 'Notifications' })).toBeVisible(); // plus de non lue
  });
});

test('un compte du personnel n\'a pas de cloche', async ({ page, context }) => {
  await mockSupabase(context, { role: 'admin', data: { ...buildData(), notifications: [notification(1)] } });
  await page.goto('/#/dashboard');
  await expect(page.getByRole('navigation')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Notifications/ })).toHaveCount(0);
});
