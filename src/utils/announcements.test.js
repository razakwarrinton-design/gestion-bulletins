import { describe, it, expect } from 'vitest';
import {
  canEdit, deadlineText, formatFcfa, isAbsentAnnouncements, isRecent, toRow, validateAnnouncement,
} from './announcements';

describe('formatFcfa', () => {
  it.each([[1500, '1 500 FCFA'], [25000, '25 000 FCFA'], [0, '0 FCFA'], [1234567, '1 234 567 FCFA'], ['2000', '2 000 FCFA']])(
    '%s → %s', (value, expected) => { expect(formatFcfa(value)).toBe(expected); });
  it('une valeur illisible donne un texte vide', () => { expect(formatFcfa('abc')).toBe(''); });
});

describe('isRecent', () => {
  const now = Date.parse('2026-10-15T12:00:00Z');
  it('moins de 7 jours : récent', () => {
    expect(isRecent('2026-10-14T12:00:00Z', 7, now)).toBe(true);
    expect(isRecent('2026-10-08T13:00:00Z', 7, now)).toBe(true);
  });
  it('plus de 7 jours, date absurde ou future lointaine : pas récent', () => {
    expect(isRecent('2026-10-08T11:00:00Z', 7, now)).toBe(false);
    expect(isRecent('nimporte quoi', 7, now)).toBe(false);
    expect(isRecent('2027-01-01T00:00:00Z', 7, now)).toBe(false);
  });
});

describe('deadlineText', () => {
  const now = new Date(2026, 9, 15, 10, 0);
  it("à venir ou aujourd'hui : « à régler avant »", () => {
    expect(deadlineText('2026-11-15', now)).toEqual({ text: 'À régler avant le 15 novembre 2026', late: false });
    expect(deadlineText('2026-10-15', now).late).toBe(false);
  });
  it('dépassée : signalée', () => {
    expect(deadlineText('2026-10-14', now)).toEqual({ text: 'Échéance dépassée (14 octobre 2026)', late: true });
  });
  it('absente ou illisible : rien', () => {
    expect(deadlineText(null, now)).toBeNull();
    expect(deadlineText('bientôt', now)).toBeNull();
  });
});

describe('validateAnnouncement', () => {
  const ok = { title: 'Relevé de notes', body: 'Coût : 1 500 FCFA.', category: 'frais', amount: '1500' };
  it('accepte une info correcte, avec ou sans montant', () => {
    expect(validateAnnouncement(ok)).toBeNull();
    expect(validateAnnouncement({ ...ok, amount: '' })).toBeNull();
    expect(validateAnnouncement({ ...ok, amount: '1 500' })).toBeNull();
  });
  it('refuse un titre ou un texte vide ou démesuré', () => {
    expect(validateAnnouncement({ ...ok, title: '  ' })).toMatch(/titre est obligatoire/);
    expect(validateAnnouncement({ ...ok, body: '' })).toMatch(/texte est obligatoire/);
    expect(validateAnnouncement({ ...ok, title: 'x'.repeat(151) })).toMatch(/titre est trop long/);
    expect(validateAnnouncement({ ...ok, body: 'x'.repeat(4001) })).toMatch(/texte est trop long/);
  });
  it("refuse un montant avec virgule, négatif, trop grand, ou sur autre chose qu'un frais", () => {
    expect(validateAnnouncement({ ...ok, amount: '1500,50' })).toMatch(/entier/);
    expect(validateAnnouncement({ ...ok, amount: '-5' })).toMatch(/entier/);
    expect(validateAnnouncement({ ...ok, amount: '999999999' })).toMatch(/trop élevé/);
    expect(validateAnnouncement({ ...ok, category: 'reglement' })).toMatch(/que pour un frais/);
  });
});

describe('toRow', () => {
  it('prépare la ligne : texte rogné, montant numérique, classe vide = tout l\'établissement', () => {
    expect(toRow({ title: ' Relevé ', body: ' Texte ', category: 'frais', amount: '1 500', deadline: '', classId: '' })).toEqual({
      title: 'Relevé', body: 'Texte', category: 'frais', amount_fcfa: 1500, deadline: null, class_id: null,
    });
  });
  it("ignore un montant resté dans le formulaire quand le type n'est plus « frais »", () => {
    expect(toRow({ title: 'a', body: 'b', category: 'reglement', amount: '500', deadline: '2026-11-01', classId: 3 }))
      .toMatchObject({ amount_fcfa: null, class_id: 3, deadline: '2026-11-01' });
  });
});

describe('canEdit / isAbsentAnnouncements', () => {
  it("l'administrateur modifie tout, le professeur seulement ses publications, les autres rien", () => {
    const item = { author_id: 'u1' };
    expect(canEdit({ role: 'admin', id: 'x' }, item)).toBe(true);
    expect(canEdit({ role: 'professeur', id: 'u1' }, item)).toBe(true);
    expect(canEdit({ role: 'professeur', id: 'u2' }, item)).toBe(false);
    expect(canEdit({ role: 'secretaire', id: 'u1' }, item)).toBe(false);
    expect(canEdit({ role: 'parent', id: 'u1' }, item)).toBe(false);
    expect(canEdit(null, item)).toBe(false);
  });
  it('reconnaît la table absente sans confondre avec une autre erreur', () => {
    expect(isAbsentAnnouncements({ code: '42P01' })).toBe(true);
    expect(isAbsentAnnouncements({ code: 'PGRST205', message: 'Could not find the table public.announcements' })).toBe(true);
    expect(isAbsentAnnouncements({ message: 'permission denied for table announcements' })).toBe(false);
    expect(isAbsentAnnouncements({ message: 'Failed to fetch' })).toBe(false);
  });
});
