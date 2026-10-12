// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import * as XLSX from 'xlsx';
import { createExcelHandlers } from './excelIO';

const setup = (overrides = {}) => {
  const classes = [{ id: 1, name: '6ème A' }];
  const students = [{ id: 10, firstName: 'Koffi', lastName: 'Mensah', classId: 1 }];
  const subjects = [{ id: 'm', name: 'Mathématiques' }];
  let nextClassId = 100;
  const deps = {
    students, classes, subjects, selectedClass: 1, selectedTrimester: '1',
    getGrade: () => null, calculateAverage: () => 0, getMention: () => ({ text: '' }),
    addClass: vi.fn(async (name) => ({ id: nextClassId++, name })),
    addStudent: vi.fn(async () => ({})),
    updateGrade: vi.fn(async () => ({ success: true })),
    showNotification: vi.fn(),
    ...overrides,
  };
  return { deps, ...createExcelHandlers(deps) };
};

describe('import des élèves', () => {
  it('crée chaque classe absente une seule fois, même si plusieurs élèves y sont', async () => {
    const { deps, importStudentRows } = setup();
    await importStudentRows([
      { Nom: 'Dossou', Prénom: 'Ama', Classe: '5ème B' },
      { Nom: 'Agbo', Prénom: 'Yao', Classe: '5ème B' },
      { Nom: 'Zinsou', Prénom: 'Esi', Classe: '5EME B'.replace('EME', 'ème') },
      { Nom: 'Bella', Prénom: 'Kodjo', Classe: '6ème a' }, // classe existante, casse différente
    ]);
    expect(deps.addClass).toHaveBeenCalledTimes(1);
    expect(deps.addClass).toHaveBeenCalledWith('5ème B');
    expect(deps.addStudent).toHaveBeenCalledTimes(4);
    expect(deps.addStudent.mock.calls.map((c) => [c[1], c[2]])).toEqual([
      ['Dossou', 100], ['Agbo', 100], ['Zinsou', 100], ['Bella', 1],
    ]);
    expect(deps.showNotification).toHaveBeenCalledWith('4 élève(s) importé(s)');
  });

  it('importer deux fois le même fichier ne double pas la classe', async () => {
    const { deps, importStudentRows } = setup();
    await importStudentRows([{ Nom: 'Mensah', Prénom: 'Koffi', Classe: '6ème A' }]);
    expect(deps.addStudent).not.toHaveBeenCalled();
    expect(deps.showNotification.mock.calls[0][0]).toMatch(/0 élève\(s\) importé\(s\), 1 ligne\(s\) ignorée\(s\) \(ligne 2 : Koffi Mensah est déjà dans 6ème A\)/);
  });

  it('un échec d\'enregistrement est compté et dit, sans arrêter les autres lignes', async () => {
    const addStudent = vi.fn().mockRejectedValueOnce(new Error('refusé')).mockResolvedValue({});
    const { deps, importStudentRows } = setup({ addStudent });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await importStudentRows([
      { Nom: 'A', Prénom: 'a', Classe: '6ème A' },
      { Nom: 'B', Prénom: 'b', Classe: '6ème A' },
    ]);
    expect(deps.showNotification).toHaveBeenCalledWith('1 élève(s) importé(s), 1 échec(s) d\'enregistrement');
  });

  it('un fichier sans les bonnes colonnes est expliqué, rien n\'est créé', async () => {
    const { deps, importStudentRows } = setup();
    await importStudentRows([{ Name: 'x' }]);
    expect(deps.addStudent).not.toHaveBeenCalled();
    expect(deps.showNotification.mock.calls[0][0]).toMatch(/Colonne\(s\) manquante\(s\)/);
  });
});

describe('import des notes', () => {
  it('importe les notes valides et dit ce qui a été ignoré', async () => {
    const { deps, importGradeRows } = setup();
    await importGradeRows([
      { Nom: 'Mensah', Prénom: 'Koffi', Mathématiques: '13,5' },
      { Nom: 'Inconnu', Prénom: 'Zoé', Mathématiques: 10 },
    ]);
    expect(deps.updateGrade).toHaveBeenCalledTimes(1);
    expect(deps.updateGrade).toHaveBeenCalledWith(10, 'm', '1', 13.5, undefined, { interro: null, devoir: null, composition: null, bonus: null });
    expect(deps.showNotification.mock.calls[0][0]).toMatch(/1 note\(s\) importée\(s\), 1 valeur\(s\) ou ligne\(s\) ignorée\(s\) \(ligne 3 : Zoé Inconnu : élève introuvable/);
  });

  it('compte les échecs d\'enregistrement', async () => {
    const { deps, importGradeRows } = setup({ updateGrade: vi.fn(async () => ({ success: false })) });
    await importGradeRows([{ Nom: 'Mensah', Prénom: 'Koffi', Mathématiques: 12 }]);
    expect(deps.showNotification.mock.calls[0][0]).toMatch(/0 note\(s\) importée\(s\), 1 échec\(s\)/);
  });

  it('sans classe sélectionnée : message, aucune lecture du fichier', async () => {
    const { deps, importGrades } = setup({ selectedClass: null });
    const event = { target: { files: [new File(['x'], 'notes.xlsx')], value: 'notes.xlsx' } };
    await importGrades(event);
    expect(deps.showNotification).toHaveBeenCalledWith("Veuillez sélectionner une classe d'abord");
    expect(event.target.value).toBe('');
  });

  it('un fichier illisible est signalé et le champ de fichier est réinitialisé', async () => {
    const { deps, importGrades } = setup();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const event = { target: { files: [new File(['ceci n\'est pas un classeur'], 'notes.xlsx')], value: 'notes.xlsx' } };
    await importGrades(event);
    expect(deps.showNotification.mock.calls.at(-1)[0]).toMatch(/Fichier illisible|ne correspond|manquant|vide|colonne/i);
    expect(event.target.value).toBe('');
    expect(deps.updateGrade).not.toHaveBeenCalled();
  });
});

describe('lecture d’un vrai classeur Excel', () => {
  const workbookFile = (rows, name = 'notes.xlsx') => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Feuille1');
    const bytes = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    return new File([bytes], name);
  };

  it('importe les notes d’un .xlsx (en-têtes sans accent, virgule décimale, lignes vides)', async () => {
    const { deps, importGrades } = setup();
    const file = workbookFile([
      ['NOM', 'prenom', 'Mathematiques', 'Moyenne'],
      ['Mensah', 'Koffi', '12,5', ''],
      [],
      ['Inconnu', 'Zoé', 10, ''],
    ]);
    const event = { target: { files: [file], value: 'notes.xlsx' } };
    await importGrades(event);
    expect(deps.updateGrade).toHaveBeenCalledTimes(1);
    expect(deps.updateGrade.mock.calls[0].slice(0, 4)).toEqual([10, 'm', '1', 12.5]);
    expect(deps.showNotification.mock.calls[0][0]).toBe('1 note(s) importée(s), 1 valeur(s) ou ligne(s) ignorée(s) (ligne 4 : Zoé Inconnu : élève introuvable dans cette classe)');
    expect(event.target.value).toBe('');
  });

  it('importe des élèves d’un .xlsx et crée la classe manquante une seule fois', async () => {
    const { deps, importStudents } = setup();
    const file = workbookFile([
      ['Nom', 'Prénom', 'Classe'],
      ['Dossou', 'Ama', '4ème C'],
      ['Agbo', 'Yao', '4ème C'],
    ]);
    await importStudents({ target: { files: [file], value: 'x' } });
    expect(deps.addClass).toHaveBeenCalledTimes(1);
    expect(deps.addStudent).toHaveBeenCalledTimes(2);
  });
});

describe('import d’un fichier CSV (Excel en français, Google Sheets, LibreOffice)', () => {
  const CSV = 'Nom;Prénom;Classe\r\nDossou;Éléonore;4ème C\r\nAgbo;Yao;4ème C\r\n';
  const fileOf = (bytes) => new File([bytes], 'eleves.csv');
  const utf8 = (text, bom = false) => new Uint8Array([...(bom ? [0xef, 0xbb, 0xbf] : []), ...new TextEncoder().encode(text)]);
  const win1252 = (text) => Uint8Array.from([...text].map((ch) => ch.charCodeAt(0))); // é, è… tiennent sur un octet

  it.each([
    ['UTF-8 sans BOM (Google Sheets, LibreOffice)', utf8(CSV)],
    ['UTF-8 avec BOM', utf8(CSV, true)],
    ['Windows-1252 (Excel en français, « CSV séparateur point-virgule »)', win1252(CSV)],
    ['séparateur virgule', utf8(CSV.replace(/;/g, ','))],
  ])('%s : les accents et les colonnes sont reconnus', async (_, bytes) => {
    const { deps, importStudents } = setup();
    await importStudents({ target: { files: [fileOf(bytes)], value: 'x' } });
    expect(deps.addClass).toHaveBeenCalledWith('4ème C');
    expect(deps.addStudent.mock.calls.map((c) => [c[0], c[1]])).toEqual([['Éléonore', 'Dossou'], ['Yao', 'Agbo']]);
    expect(deps.showNotification).toHaveBeenCalledWith('2 élève(s) importé(s)');
  });
});
