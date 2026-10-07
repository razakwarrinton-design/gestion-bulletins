import { describe, it, expect, vi, beforeEach } from 'vitest';

const invoke = vi.fn();
vi.mock('../config/supabase', () => ({ supabase: { functions: { invoke: (...args) => invoke(...args) } } }));

import { SMSService } from './SMSService';

let service;
beforeEach(() => {
  invoke.mockReset();
  service = new SMSService();
});

describe('SMSService.sendSMS', () => {
  it('envoie le numéro au format international via la fonction send-sms', async () => {
    invoke.mockResolvedValue({ data: { success: true, reference: 'ATXid_1' }, error: null });
    const result = await service.sendSMS('90 12 34 56', 'Bonjour');
    expect(invoke).toHaveBeenCalledWith('send-sms', { body: { to: '+22890123456', message: 'Bonjour' } });
    expect(result).toMatchObject({ success: true, reference: 'ATXid_1', sandbox: false });
    expect(service.getSMSHistory()).toHaveLength(1);
    expect(service.getSMSHistory()[0].status).toBe('sent');
  });

  it('signale le mode test pour ne pas faire croire à un envoi réel', async () => {
    invoke.mockResolvedValue({ data: { success: true, sandbox: true }, error: null });
    const result = await service.sendSMS('+22890123456', 'Test');
    expect(result.sandbox).toBe(true);
    expect(result.message).toMatch(/mode test/);
  });

  it('ne répond jamais « envoyé » quand la fonction échoue', async () => {
    const response = { json: async () => ({ error: 'Action non autorisée pour votre rôle' }) };
    invoke.mockResolvedValue({ data: null, error: { message: 'Edge Function returned a non-2xx', context: response } });
    const result = await service.sendSMS('+22890123456', 'Bonjour');
    expect(result).toEqual({ success: false, error: 'Action non autorisée pour votre rôle' });
    expect(service.getSMSHistory()[0]).toMatchObject({ status: 'failed', error: 'Action non autorisée pour votre rôle' });
  });

  it('traite une réponse sans succès comme un échec', async () => {
    invoke.mockResolvedValue({ data: {}, error: null });
    const result = await service.sendSMS('+22890123456', 'Bonjour');
    expect(result.success).toBe(false);
  });

  it('refuse sans appeler le serveur un numéro ou un message vide', async () => {
    expect((await service.sendSMS('', 'Bonjour')).success).toBe(false);
    expect((await service.sendSMS('+22890123456', '   ')).success).toBe(false);
    expect(invoke).not.toHaveBeenCalled();
  });
});
