import { describe, it, expect } from 'vitest';
import {
  buildParentEmail,
  cleanText,
  groupByParent,
  isEmail,
  NOTIFY_ALLOWED_ROLES,
  parseBrevoResponse,
  parseClassId,
  trimesterLabel,
} from './notify-email';

describe('rôles et paramètres', () => {
  it('seuls les administrateurs et les professeurs préviennent les parents', () => {
    expect(NOTIFY_ALLOWED_ROLES).toEqual(['admin', 'professeur']);
  });

  it.each([[1, 1], ['12', 12], [0, null], [-3, null], ['1; DROP', null], [1.5, null], [null, null], [undefined, null], [{}, null]])(
    'parseClassId(%j) = %j', (raw, expected) => { expect(parseClassId(raw)).toBe(expected); });

  it('trimesterLabel ne reconnaît que 1, 2 et 3', () => {
    expect(trimesterLabel('1')).toBe('1er trimestre');
    expect(trimesterLabel('3')).toBe('3e trimestre');
    expect(trimesterLabel('4')).toBeNull();
    expect(trimesterLabel(1)).toBeNull();
  });

  it.each([['a@b.tld', true], ['parent@ecole.tg', true], ['sans-arobase', false], ['a b@c.d', false], ['<x>@y.zz', false], ['', false], [null, false]])(
    'isEmail(%j) = %j', (value, expected) => { expect(isEmail(value)).toBe(expected); });
});

describe('groupByParent', () => {
  const pending = [
    { id: 1, user_id: 'p1', student_id: 10, trimester: '1', body: '' },
    { id: 2, user_id: 'p1', student_id: 11, trimester: '1', body: '' },
    { id: 3, user_id: 'p2', student_id: 10, trimester: '1', body: '' },
  ];
  const names = new Map([[10, 'Koffi'], [11, 'Ama']]);

  it('un seul e-mail par parent, avec le prénom de chaque enfant', () => {
    expect(groupByParent(pending, names)).toEqual([
      { userId: 'p1', notificationIds: [1, 2], firstNames: ['Koffi', 'Ama'] },
      { userId: 'p2', notificationIds: [3], firstNames: ['Koffi'] },
    ]);
  });

  it("garde la notification d'un élève dont le prénom est introuvable", () => {
    const [mail] = groupByParent([{ id: 9, user_id: 'p3', student_id: 99, trimester: '1', body: '' }], names);
    expect(mail).toEqual({ userId: 'p3', notificationIds: [9], firstNames: [] });
  });
});

describe('buildParentEmail', () => {
  it('annonce la disponibilité sans note ni moyenne', () => {
    const { subject, text } = buildParentEmail({ schoolName: 'Collège Saint-Jean', trimester: '2', firstNames: ['Koffi'], appUrl: 'https://ecole.example.tg' });
    expect(subject).toBe('Collège Saint-Jean : notes du 2e trimestre disponibles');
    expect(text).toContain('Les notes du 2e trimestre de Koffi sont disponibles');
    expect(text).toContain('https://ecole.example.tg');
    expect(text).not.toMatch(/\/\s*20|moyenne|rang/i);
  });

  it('nomme plusieurs enfants', () => {
    const { text } = buildParentEmail({ schoolName: 'E', trimester: '1', firstNames: ['Koffi', 'Ama', 'Yao'], appUrl: null });
    expect(text).toContain('de Koffi, Ama et Yao');
    expect(text).not.toContain('Connectez-vous'); // pas de lien sans adresse configurée
  });

  it("ne laisse passer ni saut de ligne ni balise venant d'un nom saisi", () => {
    const { subject, text } = buildParentEmail({ schoolName: 'École\r\nBcc: x@y.z <b>', trimester: '1', firstNames: ['Koffi\nhttp://evil.example'], appUrl: null });
    expect(subject).not.toMatch(/[\r\n<>]/);
    expect(text).not.toMatch(/<|>/);
    expect(text.split('\n').some((line) => line.startsWith('Bcc:'))).toBe(false);
  });

  it("retombe sur « l'école » et « votre enfant » sans donnée", () => {
    const { subject, text } = buildParentEmail({ schoolName: '  ', trimester: '1', firstNames: [], appUrl: null });
    expect(subject).toContain("l'école");
    expect(text).toContain('de votre enfant');
  });

  it('cleanText borne la longueur', () => {
    expect(cleanText('x'.repeat(500), 20)).toHaveLength(20);
  });
});

describe('parseBrevoResponse', () => {
  it('accepte une réponse 201 avec identifiant de message', () => {
    expect(parseBrevoResponse(201, { messageId: '<abc@smtp-relay.mailin.fr>' })).toEqual({ success: true });
  });
  it('refuse une clé invalide avec un message clair, en reprenant le motif de Brevo', () => {
    expect(parseBrevoResponse(401, { code: 'unauthorized', message: 'Key not found' })).toEqual({ success: false, error: 'Clé API e-mail refusée (BREVO_API_KEY) : Key not found' });
    expect(parseBrevoResponse(401, null)).toEqual({ success: false, error: 'Clé API e-mail refusée (BREVO_API_KEY)' });
  });
  it('reprend le message du fournisseur, sans retour à la ligne', () => {
    const result = parseBrevoResponse(400, { message: 'Sender not valid\nplease validate' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Sender not valid please validate');
  });
  it('gère une réponse vide ou inattendue', () => {
    expect(parseBrevoResponse(502, null)).toEqual({ success: false, error: "Refusé par le service d'e-mail (HTTP 502)" });
    expect(parseBrevoResponse(200, {}).success).toBe(false);
  });
});
