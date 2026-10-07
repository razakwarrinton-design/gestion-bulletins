import { describe, it, expect } from 'vitest';
import {
  normalizeRecipient,
  validateMessage,
  parseAfricasTalkingResponse,
  MAX_SMS_LENGTH,
  SMS_ALLOWED_ROLES,
} from './sms';

describe('normalizeRecipient', () => {
  it.each([
    ['+228 90 12 34 56', '+22890123456'],
    ['00228 90123456', '+22890123456'],
    ['+229-97-00-11-22', '+22997001122'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeRecipient(input)).toBe(expected);
  });

  it.each([['90123456'], ['+22'], ['+228abc'], [''], [null], [undefined], [12345678], ['+1234567890123456']])(
    'refuse %s',
    (input) => {
      expect(normalizeRecipient(input)).toBeNull();
    },
  );
});

describe('validateMessage', () => {
  it('nettoie les espaces', () => {
    expect(validateMessage('  Bonjour  ')).toBe('Bonjour');
  });
  it('refuse un message vide, trop long ou non textuel', () => {
    expect(validateMessage('   ')).toBeNull();
    expect(validateMessage('a'.repeat(MAX_SMS_LENGTH + 1))).toBeNull();
    expect(validateMessage('a'.repeat(MAX_SMS_LENGTH))).not.toBeNull();
    expect(validateMessage(42)).toBeNull();
  });
});

describe('parseAfricasTalkingResponse', () => {
  const reply = (statusCode: number, status: string) => ({
    SMSMessageData: { Message: 'Sent to 1/1', Recipients: [{ statusCode, status, messageId: 'ATXid_1' }] },
  });

  it.each([100, 101, 102])('code %s = accepté', (code) => {
    expect(parseAfricasTalkingResponse(reply(code, 'Success'))).toEqual({ success: true, reference: 'ATXid_1' });
  });

  it('un numéro refusé n\'est jamais compté comme envoyé', () => {
    expect(parseAfricasTalkingResponse(reply(403, 'InvalidPhoneNumber')))
      .toEqual({ success: false, error: 'InvalidPhoneNumber' });
  });

  it('une réponse sans destinataire est un échec', () => {
    expect(parseAfricasTalkingResponse({ SMSMessageData: { Message: 'Aucun destinataire valide', Recipients: [] } }))
      .toEqual({ success: false, error: 'Aucun destinataire valide' });
    expect(parseAfricasTalkingResponse(null).success).toBe(false);
    expect(parseAfricasTalkingResponse('<html>').success).toBe(false);
  });
});

describe('rôles autorisés', () => {
  it('exclut les parents et les comptes en attente', () => {
    expect(SMS_ALLOWED_ROLES).toEqual(['admin', 'secretaire']);
  });
});
