import { describe, it, expect, vi } from 'vitest';
import { fetchAllRows } from './fetchAllRows';

// Simule PostgREST : `serverCap` lignes au plus par réponse, quelle que soit l'étendue demandée
const fakeTable = (total, serverCap = 1000) => {
  const all = Array.from({ length: total }, (_, i) => ({ id: i + 1 }));
  const calls = [];
  const buildQuery = () => ({
    range: async (from, to) => {
      calls.push([from, to]);
      return { data: all.slice(from, Math.min(to + 1, from + serverCap)), error: null };
    },
  });
  return { buildQuery, calls };
};

describe('fetchAllRows', () => {
  it('lit toute la table quand elle dépasse la limite de 1000 lignes du serveur', async () => {
    const { buildQuery } = fakeTable(2640);
    const { data, error } = await fetchAllRows(buildQuery);
    expect(error).toBeNull();
    expect(data).toHaveLength(2640);
    expect(new Set(data.map((r) => r.id)).size).toBe(2640);
  });

  it('ne saute aucune ligne quand le serveur plafonne plus bas que la taille de page demandée', async () => {
    const { buildQuery } = fakeTable(1234, 500);
    const { data } = await fetchAllRows(buildQuery);
    expect(data.map((r) => r.id)).toEqual(Array.from({ length: 1234 }, (_, i) => i + 1));
  });

  it('renvoie une liste vide pour une table vide, et une seule page demandée pour une petite table plus une page vide', async () => {
    const empty = fakeTable(0);
    expect((await fetchAllRows(empty.buildQuery)).data).toEqual([]);
    const small = fakeTable(20);
    expect((await fetchAllRows(small.buildQuery)).data).toHaveLength(20);
    expect(small.calls).toEqual([[0, 999], [20, 1019]]);
  });

  it('renvoie l\'erreur sans données partielles si une page échoue', async () => {
    const boom = { message: 'réseau coupé' };
    let page = 0;
    const buildQuery = () => ({
      range: vi.fn(async () => (page++ === 0 ? { data: [{ id: 1 }], error: null } : { data: null, error: boom })),
    });
    expect(await fetchAllRows(buildQuery, 1)).toEqual({ data: null, error: boom });
  });

  it("s'arrête avec une erreur si le serveur ignore les pages demandées (au lieu de boucler sans fin)", async () => {
    const buildQuery = () => ({ range: async () => ({ data: [{ id: 1 }], error: null }) });
    const { data, error } = await fetchAllRows(buildQuery, 1);
    expect(data).toBeNull();
    expect(error.message).toMatch(/trop de pages/);
  });
});
