// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';

vi.mock('../config/supabase', () => ({ supabase: null }));

import { createReporter, scrub, MAX_REPORTS } from './errorReporter';

const make = (overrides = {}) => {
  const send = vi.fn().mockResolvedValue(undefined);
  const report = createReporter({
    send, getUserId: async () => 'user-1', getHash: () => '#/grades?token=abc', getUserAgent: () => 'TestBrowser/1.0', ...overrides,
  });
  return { send, report };
};
const err = (message, line = 'at f (app.js:1:1)') => Object.assign(new Error(message), { stack: `Error: ${message}\n    ${line}` });

describe('scrub', () => {
  it('masque adresses e-mail, numéros de téléphone et jetons', () => {
    expect(scrub('Erreur pour koffi.mensah@ecole.tg', 200)).toBe('Erreur pour [e-mail]');
    expect(scrub('appeler +228 90 12 34 56 ou 90123456', 200)).not.toMatch(/\d{4}/);
    expect(scrub('#access_token=abcdef&type=recovery', 200)).toBe('#access_token=[masqué]&type=recovery');
    expect(scrub('Bearer eyJhbGciOi.eyJzdWIiOi.SflKxwRJ', 200)).toBe('Bearer [jeton]');
  });

  it('garde les numéros de ligne et les versions, et tronque', () => {
    expect(scrub('at f (app.js:120:15) xlsx 0.18.5', 200)).toBe('at f (app.js:120:15) xlsx 0.18.5');
    expect(scrub('x'.repeat(1000), 300)).toHaveLength(300);
  });
});

describe('createReporter', () => {
  it("envoie le message, la pile, l'écran (sans paramètres d'adresse) et le navigateur", async () => {
    const { send, report } = make();
    await report(err('x is undefined'), 'boundary');
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toEqual({
      user_id: 'user-1', source: 'boundary', message: 'x is undefined',
      stack: 'Error: x is undefined\n    at f (app.js:1:1)', route: 'grades', user_agent: 'TestBrowser/1.0',
    });
  });

  it('ne rapporte pas deux fois la même erreur', async () => {
    const { send, report } = make();
    await report(err('boom'));
    await report(err('boom'));
    await report(err('autre', 'at g (app.js:9:9)'));
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('au plus MAX_REPORTS rapports par chargement de page', async () => {
    const { send, report } = make();
    for (let i = 0; i < MAX_REPORTS + 5; i += 1) await report(err(`erreur ${i}`, `at f${i} (a.js:${i}:1)`));
    expect(send).toHaveBeenCalledTimes(MAX_REPORTS);
  });

  it('ignore le bruit : ResizeObserver, « Script error », nouvelle version déployée', async () => {
    const { send, report } = make();
    await report(new Error('ResizeObserver loop completed with undelivered notifications.'));
    await report('Script error.');
    await report(new Error('Failed to fetch dynamically imported module: https://x/assets/Grades-1.js'));
    await report(undefined);
    expect(send).not.toHaveBeenCalled();
  });

  it('ne rapporte rien sans compte connecté', async () => {
    const { send, report } = make({ getUserId: async () => null });
    await report(err('hors connexion'));
    expect(send).not.toHaveBeenCalled();
  });

  it("ne lève jamais d'exception, et s'arrête au premier refus de la base (table absente, limite atteinte)", async () => {
    const send = vi.fn().mockRejectedValue(new Error('relation "client_errors" does not exist'));
    const { report } = make({ send });
    await expect(report(err('a'))).resolves.toBeUndefined();
    await report(err('b', 'at g (a.js:2:2)'));
    expect(send).toHaveBeenCalledTimes(1); // plus aucune tentative ensuite : pas de boucle
  });

  it("ne lève pas non plus quand la lecture de la session échoue", async () => {
    const { report } = make({ getUserId: async () => { throw new Error('réseau'); } });
    await expect(report(err('a'))).resolves.toBeUndefined();
  });

  it("n'envoie aucune route fantaisiste (jeton dans l'adresse)", async () => {
    const { send, report } = make({ getHash: () => '#access_token=secret&type=recovery' });
    await report(err('a'));
    expect(send.mock.calls[0][0].route).toBeNull();
  });
});
