import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleRequest, type HandlerDeps } from './appreciation-handler';

const body = {
  student: { firstName: 'Koffi', lastName: 'Mensah' },
  grades: [{ subjectId: 1, value: 14 }],
  subjects: [{ id: 1, name: 'Maths', coefficient: 2 }],
  trimester: '1',
  classAverage: 11,
};

const request = (payload: unknown = body, headers: Record<string, string> = { Authorization: 'Bearer jeton' }, method = 'POST') =>
  new Request('http://localhost/functions/v1/generate-appreciation', {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: method === 'POST' ? JSON.stringify(payload) : undefined,
  });

const secrets: Record<string, string> = { AI_API_KEY: 'cle', AI_MODEL: 'modele', AI_BASE_URL: 'https://ia.example.com/v1' };

const completion = (content: unknown) => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });

const makeDeps = (over: Partial<HandlerDeps> = {}): HandlerDeps => ({
  env: (name) => secrets[name],
  getUserId: async () => 'u1',
  getRole: async () => 'professeur',
  fetch: vi.fn(async () => completion('Bon trimestre.')) as unknown as typeof fetch,
  ...over,
});

beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => vi.restoreAllMocks());

describe('generate-appreciation', () => {
  it('répond à la requête préalable CORS', async () => {
    const res = await handleRequest(request(undefined, {}, 'OPTIONS'), makeDeps());
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('refuse une autre méthode que POST', async () => {
    expect((await handleRequest(request(undefined, {}, 'GET'), makeDeps())).status).toBe(405);
  });

  it('401 sans en-tête Authorization', async () => {
    const res = await handleRequest(request(body, {}), makeDeps());
    expect(res.status).toBe(401);
  });

  it('401 quand le jeton ne correspond à aucun compte', async () => {
    const res = await handleRequest(request(), makeDeps({ getUserId: async () => null }));
    expect(res.status).toBe(401);
  });

  it.each([['parent'], ['secretaire'], ['en_attente'], [null]])('403 pour le rôle %s', async (role) => {
    const fetchMock = vi.fn();
    const res = await handleRequest(request(), makeDeps({ getRole: async () => role, fetch: fetchMock as unknown as typeof fetch }));
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([['admin'], ['professeur']])('accepte le rôle %s', async (role) => {
    const res = await handleRequest(request(), makeDeps({ getRole: async () => role }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ appreciation: 'Bon trimestre.' });
  });

  it.each([['AI_API_KEY'], ['AI_MODEL'], ['AI_BASE_URL']])('503 quand le secret %s est absent', async (missing) => {
    const fetchMock = vi.fn();
    const res = await handleRequest(request(), makeDeps({
      env: (name) => (name === missing ? undefined : secrets[name]),
      fetch: fetchMock as unknown as typeof fetch,
    }));
    expect(res.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('400 pour une requête invalide, sans appeler le fournisseur', async () => {
    const fetchMock = vi.fn();
    const res = await handleRequest(request({ ...body, grades: [] }), makeDeps({ fetch: fetchMock as unknown as typeof fetch }));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("n'envoie au fournisseur que la clé, le modèle et les données autorisées", async () => {
    const fetchMock = vi.fn(async () => completion('Bien.'));
    await handleRequest(request({ ...body, student: { firstName: 'Koffi', lastName: 'Mensah', emergency_phone: '+22890123456' } }),
      makeDeps({ fetch: fetchMock as unknown as typeof fetch }));
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://ia.example.com/v1/chat/completions');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer cle');
    expect(init.body as string).toContain('Koffi');
    expect(init.body as string).not.toContain('Mensah');
    expect(init.body as string).not.toContain('90123456');
  });

  it('502 quand le fournisseur refuse (clé invalide, quota…), sans exposer sa réponse', async () => {
    const res = await handleRequest(request(), makeDeps({
      fetch: (async () => new Response('{"error":"invalid api key sk-xxx"}', { status: 401 })) as unknown as typeof fetch,
    }));
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(text).not.toContain('sk-xxx');
  });

  it('502 quand le fournisseur est injoignable', async () => {
    const res = await handleRequest(request(), makeDeps({ fetch: (async () => { throw new Error('réseau'); }) as unknown as typeof fetch }));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/injoignable/);
  });

  it('502 quand la réponse du fournisseur est vide ou illisible', async () => {
    const empty = await handleRequest(request(), makeDeps({ fetch: (async () => completion('   ')) as unknown as typeof fetch }));
    expect(empty.status).toBe(502);
    const garbage = await handleRequest(request(), makeDeps({ fetch: (async () => new Response('pas du json', { status: 200 })) as unknown as typeof fetch }));
    expect(garbage.status).toBe(502);
  });

  it("ne journalise jamais le contenu des élèves ni de l'appréciation", async () => {
    const spy = vi.spyOn(console, 'error');
    await handleRequest(request(), makeDeps({ fetch: (async () => { throw new Error('Koffi Mensah 14/20'); }) as unknown as typeof fetch }));
    const logged = JSON.stringify(spy.mock.calls);
    expect(logged).not.toContain('Koffi');
    expect(logged).not.toContain('14/20');
  });
});
