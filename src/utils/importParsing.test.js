import { describe, it, expect } from 'vitest';
import { normalizeText, parseGradeValue, parseStudentRows, parseGradeRows, summarizeProblems, workbookInput } from './importParsing';

describe('normalizeText', () => {
  it('ignore accents, majuscules et espaces superflus', () => {
    expect(normalizeText('  Éléonore   N\'DRI ')).toBe("eleonore n'dri");
    expect(normalizeText(null)).toBe('');
    expect(normalizeText(12)).toBe('12');
  });
});

describe('parseGradeValue', () => {
  it.each([
    [14, 14], ['14', 14], [' 12,5 ', 12.5], ['12.5', 12.5], [0, 0], ['0', 0], [20, 20],
  ])('%j → %s', (raw, value) => {
    expect(parseGradeValue(raw)).toEqual({ value });
  });

  it('une cellule vide n\'est pas une note (ni un zéro)', () => {
    for (const raw of ['', '  ', null, undefined]) expect(parseGradeValue(raw)).toEqual({ empty: true });
  });

  it.each([['abc'], ['ABS'], ['12 / 20'], ['1,2,3'], ['-3'], [-1], [21], ['25'], [NaN]])('%j est refusée', (raw) => {
    expect(parseGradeValue(raw).error).toBeTruthy();
  });
});

describe('parseStudentRows', () => {
  const classes = [{ id: 1, name: '6ème A' }];
  const students = [{ id: 10, firstName: 'Koffi', lastName: 'Mensah', classId: 1 }];

  it('accepte des en-têtes sans accent, en majuscules, avec des espaces', () => {
    const { valid, problems, fatal } = parseStudentRows([{ ' NOM ': 'Dossou', prenom: 'Ama', CLASSE: '6ème A' }], { classes, students });
    expect(fatal).toBeNull();
    expect(problems).toEqual([]);
    expect(valid).toEqual([{ lastName: 'Dossou', firstName: 'Ama', className: '6ème A' }]);
  });

  it('nettoie les espaces et garde les accents du nom', () => {
    const { valid } = parseStudentRows([{ Nom: '  N\'Dri ', Prénom: ' Éléonore  ', Classe: ' 6ème   A ' }], { classes, students });
    expect(valid).toEqual([{ lastName: "N'Dri", firstName: 'Éléonore', className: '6ème A' }]);
  });

  it('ignore les lignes vides sans bruit et signale les lignes incomplètes avec leur numéro', () => {
    const { valid, problems } = parseStudentRows([
      { Nom: 'Dossou', Prénom: 'Ama', Classe: '6ème A' },
      { Nom: '', Prénom: '', Classe: '' },
      { Nom: 'Agbo', Prénom: '', Classe: '6ème A' },
    ], { classes, students });
    expect(valid).toHaveLength(1);
    expect(problems).toEqual([{ line: 4, reason: 'Nom, Prénom ou Classe manquant' }]);
  });

  it('ne recrée pas un élève déjà dans la classe (importer deux fois le même fichier)', () => {
    const { valid, problems } = parseStudentRows([{ Nom: 'MENSAH', Prénom: 'koffi', Classe: '6EME A'.replace('EME', 'ème') }], { classes, students });
    expect(valid).toEqual([]);
    expect(problems[0]).toMatchObject({ line: 2 });
    expect(problems[0].reason).toMatch(/déjà dans/);
  });

  it('un homonyme dans une autre classe est un autre élève', () => {
    const { valid } = parseStudentRows([{ Nom: 'Mensah', Prénom: 'Koffi', Classe: '5ème B' }], { classes, students });
    expect(valid).toHaveLength(1);
  });

  it('signale un doublon à l\'intérieur du fichier', () => {
    const { valid, problems } = parseStudentRows([
      { Nom: 'Dossou', Prénom: 'Ama', Classe: '6ème A' },
      { Nom: 'dossou', Prénom: 'AMA', Classe: '6ème a' },
    ], { classes, students });
    expect(valid).toHaveLength(1);
    expect(problems[0].reason).toMatch(/déjà plus haut/);
  });

  it('refuse un fichier sans les bonnes colonnes, en les nommant', () => {
    const wrong = parseStudentRows([{ Name: 'x', Class: 'y' }], { classes, students });
    expect(wrong.fatal).toMatch(/Nom, Prénom, Classe/);
    expect(parseStudentRows([], { classes, students }).fatal).toMatch(/vide/);
  });
});

describe('parseGradeRows', () => {
  const subjects = [{ id: 'm', name: 'Mathématiques' }, { id: 'f', name: 'Français' }];
  const students = [
    { id: 1, firstName: 'Koffi', lastName: 'Mensah' },
    { id: 2, firstName: 'Ama', lastName: 'Dossou' },
    { id: 3, firstName: 'Yao', lastName: 'Agbo' },
    { id: 4, firstName: 'Yao', lastName: 'Agbo' }, // homonyme exact
  ];

  it('lit les notes, virgule décimale comprise, avec des colonnes de matière insensibles aux accents et à la casse', () => {
    const { updates, problems, fatal } = parseGradeRows([
      { Nom: 'Mensah', Prénom: 'Koffi', mathematiques: '12,5', FRANÇAIS: 14 },
    ], { students, subjects });
    expect(fatal).toBeNull();
    expect(problems).toEqual([]);
    expect(updates).toEqual([
      { studentId: 1, subjectId: 'm', value: 12.5 },
      { studentId: 1, subjectId: 'f', value: 14 },
    ]);
  });

  it('une cellule vide laisse la note existante intacte (aucune mise à jour)', () => {
    const { updates } = parseGradeRows([{ Nom: 'Mensah', Prénom: 'Koffi', Mathématiques: '', Français: 15 }], { students, subjects });
    expect(updates).toEqual([{ studentId: 1, subjectId: 'f', value: 15 }]);
  });

  it('signale élève introuvable, homonyme, valeur invalide, hors limites et doublon, avec le numéro de ligne', () => {
    const { updates, problems } = parseGradeRows([
      { Nom: 'Inconnu', Prénom: 'Zoé', Mathématiques: 10 }, // ligne 2
      { Nom: 'Agbo', Prénom: 'Yao', Mathématiques: 10 }, // ligne 3 : deux élèves
      { Nom: 'Dossou', Prénom: 'Ama', Mathématiques: 'abc', Français: 25 }, // ligne 4 : deux valeurs invalides
      { Nom: 'Mensah', Prénom: 'Koffi', Mathématiques: 9 }, // ligne 5 : bon
      { Nom: 'Mensah', Prénom: 'Koffi', Mathématiques: 18 }, // ligne 6 : doublon
    ], { students, subjects });
    expect(updates).toEqual([{ studentId: 1, subjectId: 'm', value: 9 }]);
    expect(problems.map((p) => p.line)).toEqual([2, 3, 4, 4, 6]);
    expect(problems[0].reason).toMatch(/introuvable/);
    expect(problems[1].reason).toMatch(/plusieurs élèves/);
    expect(problems[2].reason).toMatch(/n'est pas une note/);
    expect(problems[3].reason).toMatch(/hors de 0 à 20/);
    expect(problems[4].reason).toMatch(/déjà plus haut/);
  });

  it('accepte le fichier exporté par l\'application (colonne « Moyenne » ignorée sans alerte)', () => {
    const { updates, ignoredColumns } = parseGradeRows([
      { Nom: 'Dossou', Prénom: 'Ama', Mathématiques: 11, Français: 13, Moyenne: '12.20' },
    ], { students, subjects });
    expect(updates).toHaveLength(2);
    expect(ignoredColumns).toEqual([]);
  });

  it('signale une colonne inconnue (faute de frappe sur une matière) au lieu de l\'ignorer en silence', () => {
    const { updates, ignoredColumns } = parseGradeRows([
      { Nom: 'Dossou', Prénom: 'Ama', Mathematics: 11, Français: 13 },
    ], { students, subjects });
    expect(updates).toHaveLength(1);
    expect(ignoredColumns).toEqual(['mathematics']);
  });

  it('refuse un fichier sans colonne Nom/Prénom ou sans aucune matière reconnue', () => {
    expect(parseGradeRows([{ Élève: 'Koffi', Mathématiques: 10 }], { students, subjects }).fatal).toMatch(/« Nom » et « Prénom »/);
    const none = parseGradeRows([{ Nom: 'Dossou', Prénom: 'Ama', Chimie: 10 }], { students, subjects });
    expect(none.fatal).toMatch(/Aucune colonne ne correspond à une matière/);
    expect(none.fatal).toContain('Mathématiques, Français');
    expect(parseGradeRows([], { students, subjects }).fatal).toMatch(/vide/);
  });
});

describe('summarizeProblems', () => {
  it('montre les premiers problèmes puis le nombre des autres', () => {
    const problems = [1, 2, 3, 4, 5].map((line) => ({ line, reason: `raison ${line}` }));
    expect(summarizeProblems(problems)).toBe('ligne 1 : raison 1 ; ligne 2 : raison 2 ; ligne 3 : raison 3 … et 2 autre(s)');
    expect(summarizeProblems(problems.slice(0, 1))).toBe('ligne 1 : raison 1');
    expect(summarizeProblems([])).toBe('');
  });
});

describe('workbookInput', () => {
  it('lit un classeur (.xlsx « PK », .xls OLE) tel quel', () => {
    expect(workbookInput(Uint8Array.from([0x50, 0x4b, 3, 4])).type).toBe('array');
    expect(workbookInput(Uint8Array.from([0xd0, 0xcf, 0x11, 0xe0, 0])).type).toBe('array');
  });

  it('décode un texte en UTF-8, avec ou sans BOM, sans déformer les accents', () => {
    const bytes = new TextEncoder().encode('Prénom;Éléonore');
    expect(workbookInput(bytes)).toEqual({ data: 'Prénom;Éléonore', type: 'string' });
    expect(workbookInput(Uint8Array.from([0xef, 0xbb, 0xbf, ...bytes])).data).toBe('Prénom;Éléonore');
  });

  it('retombe sur Windows-1252 quand le texte n’est pas de l’UTF-8 valide', () => {
    expect(workbookInput(Uint8Array.from([0x50, 0x72, 0xe9, 0x6e, 0x6f, 0x6d])).data).toBe('Prénom');
  });
});
