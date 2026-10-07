import { describe, it, expect } from 'vitest';
import {
  mapFedapayStatus,
  unwrapEntity,
  splitPhoneNumber,
  signWebhookPayload,
  verifyWebhookSignature,
  timingSafeEqual,
  createFedapayClient,
} from './fedapay';

describe('mapFedapayStatus', () => {
  it.each([
    ['approved', 'completed'],
    ['transferred', 'completed'],
    ['APPROVED', 'completed'],
    ['declined', 'failed'],
    ['canceled', 'failed'],
    ['refunded', 'failed'],
    ['expired', 'failed'],
    ['pending', 'pending'],
  ])('%s → %s', (input, expected) => {
    expect(mapFedapayStatus(input)).toBe(expected);
  });

  it('ne marque jamais un statut inconnu comme réussi', () => {
    expect(mapFedapayStatus('something_new')).toBe('pending');
    expect(mapFedapayStatus(undefined)).toBe('pending');
    expect(mapFedapayStatus(null)).toBe('pending');
  });
});

describe('unwrapEntity', () => {
  it('lit l\'enveloppe "v1/transaction"', () => {
    expect(unwrapEntity({ 'v1/transaction': { id: 7 } }, 'transaction')).toEqual({ id: 7 });
  });
  it('lit l\'enveloppe sans préfixe de version', () => {
    expect(unwrapEntity({ transaction: { id: 8 } }, 'transaction')).toEqual({ id: 8 });
  });
  it('accepte l\'objet nu', () => {
    expect(unwrapEntity({ id: 9 }, 'transaction')).toEqual({ id: 9 });
  });
  it('prend le premier élément d\'un tableau', () => {
    expect(unwrapEntity({ 'v1/transaction': [{ id: 1 }, { id: 2 }] }, 'transaction')).toEqual({ id: 1 });
  });
  it('renvoie null pour une réponse vide', () => {
    expect(unwrapEntity(null, 'transaction')).toBeNull();
  });
});

describe('splitPhoneNumber', () => {
  it.each([
    ['+22890123456', { number: '90123456', country: 'tg' }],
    ['+228 90 12 34 56', { number: '90123456', country: 'tg' }],
    ['0022996123456', { number: '96123456', country: 'bj' }],
    ['+2250707070707', { number: '0707070707', country: 'ci' }],
    ['+221771234567', { number: '771234567', country: 'sn' }],
  ])('%s', (input, expected) => {
    expect(splitPhoneNumber(input)).toEqual(expected);
  });

  it('refuse un numéro sans indicatif pays (pas de devinette)', () => {
    expect(splitPhoneNumber('90123456')).toBeNull();
  });
  it('refuse un pays non géré ou un numéro trop court', () => {
    expect(splitPhoneNumber('+33612345678')).toBeNull();
    expect(splitPhoneNumber('+2289012')).toBeNull();
    expect(splitPhoneNumber('')).toBeNull();
  });
});

describe('signature des webhooks', () => {
  const secret = 'wh_sandbox_test_secret';
  const payload = JSON.stringify({ name: 'transaction.approved', entity: { id: 42 } });
  const now = 1_800_000_000;

  it('accepte une signature valide', async () => {
    const header = await signWebhookPayload(payload, secret, now);
    expect(await verifyWebhookSignature(payload, header, secret, { nowSeconds: now })).toBe(true);
  });

  it('refuse un corps modifié', async () => {
    const header = await signWebhookPayload(payload, secret, now);
    const tampered = payload.replace('42', '43');
    expect(await verifyWebhookSignature(tampered, header, secret, { nowSeconds: now })).toBe(false);
  });

  it('refuse un mauvais secret', async () => {
    const header = await signWebhookPayload(payload, 'autre_secret', now);
    expect(await verifyWebhookSignature(payload, header, secret, { nowSeconds: now })).toBe(false);
  });

  it('refuse une signature trop ancienne (rejeu)', async () => {
    const header = await signWebhookPayload(payload, secret, now - 3600);
    expect(await verifyWebhookSignature(payload, header, secret, { nowSeconds: now })).toBe(false);
  });

  it.each([null, '', 'n_importe_quoi', 't=abc,s=123', 't=1800000000'])(
    'refuse un en-tête invalide (%s)',
    async (header) => {
      expect(await verifyWebhookSignature(payload, header, secret, { nowSeconds: now })).toBe(false);
    },
  );

  it('refuse quand le secret est absent', async () => {
    const header = await signWebhookPayload(payload, secret, now);
    expect(await verifyWebhookSignature(payload, header, '', { nowSeconds: now })).toBe(false);
  });

  it('timingSafeEqual compare correctement', () => {
    expect(timingSafeEqual('abc', 'abc')).toBe(true);
    expect(timingSafeEqual('abc', 'abd')).toBe(false);
    expect(timingSafeEqual('abc', 'abcd')).toBe(false);
  });
});

describe('createFedapayClient', () => {
  const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  it('crée la collecte puis le lien de paiement (sandbox par défaut)', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const client = createFedapayClient({
      secretKey: 'sk_sandbox_x',
      fetchImpl: async (url, init) => {
        calls.push({ url, init });
        if (url.endsWith('/transactions')) {
          return jsonResponse({ 'v1/transaction': { id: 123, reference: 'trx_abc' } }, 201);
        }
        return jsonResponse({ token: 'tok_1', url: 'https://pay.fedapay.test/tok_1' });
      },
    });

    const result = await client.createCollect({
      description: 'Scolarité',
      amount: 25000,
      callbackUrl: 'https://app.test/paiement',
      merchantReference: 'pay-uuid-1',
      customer: { firstname: 'Ama', lastname: 'Dossou', phone: { number: '90123456', country: 'tg' } },
      metadata: { payment_id: 'pay-uuid-1' },
    });

    expect(result).toEqual({
      externalId: '123',
      reference: 'trx_abc',
      paymentUrl: 'https://pay.fedapay.test/tok_1',
    });
    expect(calls[0].url).toBe('https://sandbox-api.fedapay.com/v1/transactions');
    expect(calls[1].url).toBe('https://sandbox-api.fedapay.com/v1/transactions/123/token');

    const headers = calls[0].init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer sk_sandbox_x');

    const sent = JSON.parse(String(calls[0].init?.body));
    expect(sent).toMatchObject({
      amount: 25000,
      currency: { iso: 'XOF' },
      merchant_reference: 'pay-uuid-1',
      customer: { phone_number: { number: '90123456', country: 'tg' } },
    });
  });

  it('utilise l\'URL de production en mode live', async () => {
    let seen = '';
    const client = createFedapayClient({
      secretKey: 'sk_live_x',
      env: 'live',
      fetchImpl: async (url) => {
        seen = url;
        return jsonResponse({ 'v1/transaction': { id: 5, status: 'approved', amount: 1000 } });
      },
    });
    const tx = await client.getTransaction(5);
    expect(seen).toBe('https://api.fedapay.com/v1/transactions/5');
    expect(tx).toMatchObject({ externalId: '5', status: 'approved', amount: 1000 });
  });

  it('refuse un montant invalide avant tout appel réseau', async () => {
    let called = false;
    const client = createFedapayClient({
      secretKey: 'k',
      fetchImpl: async () => {
        called = true;
        return jsonResponse({});
      },
    });
    for (const amount of [0, -5, 10.5, Number.NaN]) {
      await expect(
        client.createCollect({ description: 'x', amount, callbackUrl: 'u', merchantReference: 'r', customer: {} }),
      ).rejects.toThrow(/entier/);
    }
    expect(called).toBe(false);
  });

  it('remonte l\'erreur de l\'API', async () => {
    const client = createFedapayClient({
      secretKey: 'k',
      fetchImpl: async () => jsonResponse({ message: 'Invalid API key' }, 401),
    });
    await expect(client.getTransaction(1)).rejects.toThrow('Invalid API key');
  });

  it('échoue si la réponse ne contient ni identifiant ni lien', async () => {
    const noId = createFedapayClient({ secretKey: 'k', fetchImpl: async () => jsonResponse({}) });
    await expect(
      noId.createCollect({ description: 'x', amount: 100, callbackUrl: 'u', merchantReference: 'r', customer: {} }),
    ).rejects.toThrow(/identifiant/);

    const noUrl = createFedapayClient({
      secretKey: 'k',
      fetchImpl: async (url) =>
        url.endsWith('/transactions') ? jsonResponse({ 'v1/transaction': { id: 1 } }) : jsonResponse({ token: 't' }),
    });
    await expect(
      noUrl.createCollect({ description: 'x', amount: 100, callbackUrl: 'u', merchantReference: 'r', customer: {} }),
    ).rejects.toThrow(/lien de paiement/);
  });
});
