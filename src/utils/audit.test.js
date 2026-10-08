import { describe, it, expect } from 'vitest';
import { describeChanges, actorName, auditToCsv, tableLabel, actionLabel } from './audit';

const update = {
  created_at: '2026-01-15T10:00:00Z', actor_id: 'u1', actor_role: 'professeur', action: 'UPDATE',
  table_name: 'grades', record_id: 'g1', old_value: { value: 12, appreciation: null }, new_value: { value: 15, appreciation: 'Bien' },
};
const profiles = { u1: { first_name: 'Awa', last_name: 'Kossi', email: 'awa@ecole.test' } };

describe('describeChanges', () => {
  it('liste avant / après pour une modification', () => {
    expect(describeChanges(update)).toEqual([
      { field: 'appreciation', before: '∅', after: 'Bien' },
      { field: 'value', before: '12', after: '15' },
    ]);
  });
  it('n\'indique que la valeur finale pour une création et que l\'ancienne pour une suppression', () => {
    expect(describeChanges({ action: 'INSERT', old_value: null, new_value: { value: 12 } }))
      .toEqual([{ field: 'value', before: undefined, after: '12' }]);
    expect(describeChanges({ action: 'DELETE', old_value: { value: 12 }, new_value: null }))
      .toEqual([{ field: 'value', before: '12', after: undefined }]);
  });
  it('supporte une entrée sans détail', () => {
    expect(describeChanges({ action: 'UPDATE' })).toEqual([]);
  });
});

describe('actorName', () => {
  it('nom du profil, sinon e-mail, sinon compte supprimé, et « Système » sans utilisateur', () => {
    expect(actorName(update, profiles)).toBe('Awa Kossi');
    expect(actorName(update, { u1: { email: 'awa@ecole.test' } })).toBe('awa@ecole.test');
    expect(actorName(update, {})).toBe('Compte supprimé');
    expect(actorName({ actor_id: null }, profiles)).toBe('Système');
  });
});

describe('libellés', () => {
  it('traduit les tables et actions, et garde un nom inconnu tel quel', () => {
    expect(tableLabel('grades')).toBe('Notes');
    expect(tableLabel('autre')).toBe('autre');
    expect(actionLabel('DELETE')).toBe('Suppression');
  });
});

describe('auditToCsv', () => {
  it('produit un CSV lisible par Excel (BOM, séparateur point-virgule)', () => {
    const csv = auditToCsv([update], profiles);
    expect(csv.startsWith('\uFEFF"Date";"Auteur"')).toBe(true);
    const [, row] = csv.split('\r\n');
    expect(row).toContain('"Awa Kossi";"professeur";"Modification";"Notes";"g1"');
    expect(row).toContain('value : 12 → 15');
  });

  it('neutralise les formules et double les guillemets', () => {
    const csv = auditToCsv([{
      ...update, record_id: '=HYPERLINK("http://mal")', old_value: { note: 'dit "oui"' }, new_value: { note: '+1' },
    }], profiles);
    expect(csv).toContain(`"'=HYPERLINK(""http://mal"")"`);
    expect(csv).toContain('note : dit ""oui"" → +1');
  });
});
