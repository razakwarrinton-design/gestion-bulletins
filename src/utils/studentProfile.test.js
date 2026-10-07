import { describe, it, expect } from 'vitest';
import { mapStudentRow, buildStudentProfilePayload } from './studentProfile';

describe('mapStudentRow', () => {
  it('convertit les colonnes de base en camelCase', () => {
    const s = mapStudentRow({ id: 1, first_name: 'Ama', last_name: 'Dossou', class_id: 3 });
    expect(s).toMatchObject({ id: 1, firstName: 'Ama', lastName: 'Dossou', classId: 3 });
  });

  it('expose le profil quand les colonnes existent', () => {
    const s = mapStudentRow({
      id: 1, first_name: 'A', last_name: 'B', class_id: 1,
      emergency_phone: '+22890123456', emergency_name: 'Awa', birth_date: '2012-05-01',
    });
    expect(s.emergencyPhone).toBe('+22890123456');
    expect(s.emergencyName).toBe('Awa');
    expect(s.birthDate).toBe('2012-05-01');
  });

  it('n\'invente pas de champ de profil quand la colonne est absente', () => {
    const s = mapStudentRow({ id: 1, first_name: 'A', last_name: 'B', class_id: 1 });
    expect(s).not.toHaveProperty('emergencyPhone');
  });
});

describe('buildStudentProfilePayload', () => {
  const form = {
    birthDate: '2012-05-01', gender: 'F', photoUrl: null,
    emergencyName: 'Awa', emergencyPhone: '+22890123456', emergencyRelation: 'Mère',
  };

  it('création : n\'envoie que les valeurs renseignées', () => {
    expect(buildStudentProfilePayload(form)).toEqual({
      birth_date: '2012-05-01', gender: 'F',
      emergency_name: 'Awa', emergency_phone: '+22890123456', emergency_relation: 'Mère',
    });
  });

  it('création avec un formulaire vide : aucune colonne envoyée', () => {
    const empty = { birthDate: null, gender: null, photoUrl: null, emergencyName: null, emergencyPhone: null, emergencyRelation: null };
    expect(buildStudentProfilePayload(empty)).toEqual({});
  });

  it('ignore les champs non fournis', () => {
    expect(buildStudentProfilePayload({})).toEqual({});
    expect(buildStudentProfilePayload(undefined)).toEqual({});
  });

  it('modification : une valeur vide efface une colonne existante', () => {
    const existing = { id: 1, emergency_phone: '+22890123456' };
    expect(buildStudentProfilePayload({ emergencyPhone: null }, existing)).toEqual({ emergency_phone: null });
  });

  it('modification : n\'écrit pas une colonne vide qui n\'existe pas encore en base', () => {
    const existing = { id: 1, first_name: 'A' }; // migration non appliquée
    expect(buildStudentProfilePayload({ emergencyPhone: null, gender: null }, existing)).toEqual({});
  });

  it('modification : une valeur renseignée est envoyée même si la colonne est inconnue (erreur claire côté base)', () => {
    expect(buildStudentProfilePayload({ emergencyPhone: '+22890123456' }, { id: 1 })).toEqual({
      emergency_phone: '+22890123456',
    });
  });
});

describe('accès au bulletin (bulletinAccess)', () => {
  it('modification : envoyé quand la colonne existe en base, y compris false', () => {
    const existing = { id: 1, bulletin_access: true };
    expect(buildStudentProfilePayload({ bulletinAccess: false }, existing)).toEqual({ bulletin_access: false });
    expect(buildStudentProfilePayload({ bulletinAccess: true }, existing)).toEqual({ bulletin_access: true });
  });

  it('jamais envoyé si la colonne est absente ou à la création', () => {
    expect(buildStudentProfilePayload({ bulletinAccess: true }, { id: 1 })).toEqual({});
    expect(buildStudentProfilePayload({ bulletinAccess: true })).toEqual({});
  });
});
