import { describe, it, expect, vi, beforeEach } from 'vitest';

const invoke = vi.fn();
let tableRows = [];

vi.mock('../config/supabase', () => ({
  supabase: {
    functions: { invoke: (...args) => invoke(...args) },
    from: () => ({
      select: () => ({
        eq: async () => ({ data: tableRows, error: null }),
      }),
    }),
  },
}));
vi.mock('./SMSService', () => ({
  smsService: { notifyPaymentCreated: vi.fn() },
}));

import { PaymentService } from './PaymentService';
import { smsService } from './SMSService';

const service = new PaymentService();
const base = { studentId: 12, amount: 25000, provider: 'mobile_money', phoneNumber: '+22890123456' };

beforeEach(() => {
  invoke.mockReset();
  smsService.notifyPaymentCreated.mockReset();
  tableRows = [];
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('initiatePayment', () => {
  it('appelle payment-initiate et renvoie le lien de paiement', async () => {
    invoke.mockResolvedValue({
      data: { success: true, paymentId: 'p1', reference: 'trx_1', paymentUrl: 'https://pay.test/x' },
      error: null,
    });

    const result = await service.initiatePayment({ ...base, description: 'Scolarité' });

    expect(invoke).toHaveBeenCalledWith('payment-initiate', {
      body: { studentId: 12, amount: 25000, feeTypeId: null, description: 'Scolarité', phoneNumber: '+22890123456' },
    });
    expect(result).toMatchObject({ success: true, paymentId: 'p1', redirectUrl: 'https://pay.test/x' });
  });

  it('n\'envoie jamais de statut ni de clé au serveur', async () => {
    invoke.mockResolvedValue({ data: { success: true, paymentUrl: 'u' }, error: null });
    await service.initiatePayment({ ...base, status: 'completed', secretKey: 'x' });
    const body = invoke.mock.calls[0][1].body;
    expect(body).not.toHaveProperty('status');
    expect(body).not.toHaveProperty('secretKey');
  });

  it('remonte le message d\'erreur renvoyé par la fonction Edge', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: { message: 'Edge Function returned a non-2xx status code', context: { json: async () => ({ error: 'Numéro invalide' }) } },
    });
    const result = await service.initiatePayment(base);
    expect(result).toEqual({ success: false, error: 'Numéro invalide' });
  });

  it('retombe sur le message générique si le corps est illisible', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: { message: 'boom', context: { json: async () => { throw new Error('pas du json'); } } },
    });
    expect((await service.initiatePayment(base)).error).toBe('boom');
  });

  it.each([
    ['montant décimal', { amount: 100.5 }],
    ['montant négatif', { amount: -10 }],
    ['moyen inconnu', { provider: 'bitcoin' }],
    ['élève manquant', { studentId: undefined }],
  ])('refuse sans appeler le serveur : %s', async (_label, override) => {
    const result = await service.initiatePayment({ ...base, ...override });
    expect(result.success).toBe(false);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('refuse une réponse sans lien de paiement', async () => {
    invoke.mockResolvedValue({ data: { success: true }, error: null });
    expect((await service.initiatePayment(base)).success).toBe(false);
  });

  it('un échec du SMS ne fait pas échouer le paiement', async () => {
    invoke.mockResolvedValue({ data: { success: true, reference: 'r', paymentUrl: 'u' }, error: null });
    smsService.notifyPaymentCreated.mockRejectedValue(new Error('SMS indisponible'));
    const result = await service.initiatePayment({ ...base, parentPhone: '+22890123456', parentName: 'Awa' });
    expect(result.success).toBe(true);
  });
});

describe('getPaymentStatistics', () => {
  it('ne compte que les paiements confirmés dans le total encaissé', async () => {
    tableRows = [
      { amount_paid: 10000, status: 'completed' },
      { amount_paid: 5000, status: 'completed' },
      { amount_paid: 99999, status: 'pending' },
      { amount_paid: 88888, status: 'failed' },
    ];
    expect(await service.getPaymentStatistics(1)).toEqual({
      total: 4,
      completed: 2,
      totalAmount: 15000,
      averageAmount: 7500,
    });
  });

  it('renvoie 0 sans paiement confirmé', async () => {
    tableRows = [{ amount_paid: 1000, status: 'pending' }];
    expect(await service.getPaymentStatistics(1)).toMatchObject({ totalAmount: 0, averageAmount: 0 });
  });
});

describe('moyens de paiement', () => {
  it('ne propose que le Mobile Money (plus de faux Stripe/PayPal/virement)', () => {
    expect(service.getAvailableProviders().map((p) => p.id)).toEqual(['mobile_money']);
    expect(service.providerNeedsPhone('mobile_money')).toBe(true);
  });
});
