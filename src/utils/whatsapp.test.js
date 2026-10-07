import { describe, it, expect } from 'vitest';
import { normalizeWhatsappNumber, buildBulletinMessage, buildWhatsappLink } from './whatsapp';

describe('normalizeWhatsappNumber', () => {
  it.each([
    ['+228 90 12 34 56', '22890123456'],
    ['+22890123456', '22890123456'],
    ['0022890123456', '22890123456'],
    ['+229 96 12 34 56', '22996123456'],
    ['+225 07 07 07 07 07', '2250707070707'],
    ['90123456', '22890123456'], // 8 chiffres sans indicatif → Togo par défaut
    ['90 12 34 56', '22890123456'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeWhatsappNumber(input)).toBe(expected);
  });

  it('utilise l\'indicatif par défaut fourni', () => {
    expect(normalizeWhatsappNumber('96123456', '229')).toBe('22996123456');
  });

  it.each([null, undefined, '', '   ', 'abc', '1234', '+228', '0707070707', '901234567890123456'])(
    'refuse %s (ni indicatif ni 8 chiffres, ou longueur impossible)',
    (input) => {
      expect(normalizeWhatsappNumber(input)).toBeNull();
    },
  );
});

describe('buildBulletinMessage', () => {
  const base = {
    student: { firstName: 'Ama', lastName: 'Dossou' },
    className: '6ème A', trimester: '2', average: '13.7142', mentionText: 'Encouragements',
    rank: 3, outOf: 28, schoolName: 'Collège Les Lumières',
  };

  it('contient les informations essentielles', () => {
    const msg = buildBulletinMessage(base);
    expect(msg).toContain('Ama Dossou (6ème A)');
    expect(msg).toContain('trimestre 2');
    expect(msg).toContain('13.71/20');
    expect(msg).toContain('Mention : Encouragements');
    expect(msg).toContain('Rang : 3/28');
    expect(msg).toContain('Collège Les Lumières');
  });

  it('omet le rang et la mention quand ils sont inconnus', () => {
    const msg = buildBulletinMessage({ ...base, rank: 0, outOf: 0, mentionText: '' });
    expect(msg).not.toContain('Rang');
    expect(msg).not.toContain('Mention');
  });

  it('affiche un tiret si la moyenne est inutilisable', () => {
    expect(buildBulletinMessage({ ...base, average: 'N/A' })).toContain('Moyenne générale : -/20');
  });
});

describe('buildWhatsappLink', () => {
  it('encode le message dans l\'URL', () => {
    const link = buildWhatsappLink('+228 90 12 34 56', 'Bonjour & merci\nà bientôt');
    expect(link.startsWith('https://wa.me/22890123456?text=')).toBe(true);
    expect(link).toContain(encodeURIComponent('Bonjour & merci\nà bientôt'));
    expect(link).not.toContain('\n');
  });

  it('renvoie null pour un numéro inutilisable', () => {
    expect(buildWhatsappLink('abc', 'x')).toBeNull();
    expect(buildWhatsappLink('', 'x')).toBeNull();
  });
});
