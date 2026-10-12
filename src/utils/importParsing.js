// Lecture des fichiers Excel d'import (élèves, notes) : fonctions pures, testées sans navigateur.
//
// Un fichier saisi à la main contient presque toujours des écarts : « prenom » sans accent, un espace en fin de nom,
// « 12,5 » au lieu de « 12.5 », une ligne vide, la même personne deux fois. Ces fonctions les tolèrent quand le sens
// est sûr, et signalent chaque ligne ignorée avec sa raison au lieu de la perdre en silence.

/** Texte comparable : sans accents ni majuscules, espaces simplifiés (« Éléonore  N'Dri » = « eleonore n'dri »). */
export const normalizeText = (value) => String(value ?? '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\s+/g, ' ').trim().toLowerCase();

const isBlank = (v) => v === undefined || v === null || String(v).trim() === '';

/** Ligne dont les en-têtes sont normalisés (« Prénom » → « prenom ») et les textes nettoyés. */
const remap = (row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [
  normalizeText(k), typeof v === 'string' ? v.trim() : v,
]));

/** Numéro de ligne dans Excel : l'en-tête est la ligne 1. */
const lineOf = (index) => index + 2;

const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

/**
 * Note lue dans une cellule : nombre, ou texte avec virgule décimale (« 12,5 »). Renvoie
 * { value } si la note est utilisable, { empty: true } si la cellule est vide, { error } sinon.
 */
export function parseGradeValue(raw) {
  if (isBlank(raw)) return { empty: true };
  const text = String(raw).trim();
  const n = typeof raw === 'number' ? raw : (/^\d+([.,]\d+)?$/.test(text) ? Number(text.replace(',', '.')) : NaN);
  if (!Number.isFinite(n)) return { error: `« ${clean(raw).slice(0, 20)} » n'est pas une note` };
  if (n < 0 || n > 20) return { error: `${n} est hors de 0 à 20` };
  return { value: n };
}

const STUDENT_COLUMN_LABELS = { nom: 'Nom', prenom: 'Prénom', classe: 'Classe' };

/**
 * Import d'élèves : colonnes Nom, Prénom, Classe.
 * `classes` et `students` décrivent l'existant : un élève déjà présent dans la même classe n'est pas recréé
 * (importer deux fois le même fichier ne doit pas doubler la classe).
 * Renvoie { valid: [{ lastName, firstName, className }], problems: [{ line, reason }], fatal }.
 */
export function parseStudentRows(rawRows, { classes = [], students = [] } = {}) {
  const rows = rawRows.map(remap);
  if (rows.length === 0) return { valid: [], problems: [], fatal: 'Le fichier est vide.' };
  const columns = new Set(rows.flatMap((r) => Object.keys(r)));
  const missing = Object.keys(STUDENT_COLUMN_LABELS).filter((c) => !columns.has(c));
  if (missing.length) {
    return {
      valid: [], problems: [],
      fatal: `Colonne(s) manquante(s) : ${missing.map((c) => STUDENT_COLUMN_LABELS[c]).join(', ')}. La première ligne doit contenir « Nom », « Prénom » et « Classe ».`,
    };
  }

  const classIdByName = new Map(classes.map((c) => [normalizeText(c.name), c.id]));
  const existing = new Set(students.map((s) => `${normalizeText(s.lastName)}|${normalizeText(s.firstName)}|${s.classId}`));
  const seen = new Set();
  const valid = [];
  const problems = [];

  rows.forEach((row, index) => {
    if (Object.values(row).every(isBlank)) return; // ligne vide : ignorée sans bruit
    const lastName = clean(row.nom);
    const firstName = clean(row.prenom);
    const className = clean(row.classe);
    if (!lastName || !firstName || !className) {
      problems.push({ line: lineOf(index), reason: 'Nom, Prénom ou Classe manquant' });
      return;
    }
    const key = `${normalizeText(lastName)}|${normalizeText(firstName)}|${normalizeText(className)}`;
    if (seen.has(key)) {
      problems.push({ line: lineOf(index), reason: `${firstName} ${lastName} apparaît déjà plus haut dans le fichier` });
      return;
    }
    seen.add(key);
    const classId = classIdByName.get(normalizeText(className));
    if (classId !== undefined && existing.has(`${normalizeText(lastName)}|${normalizeText(firstName)}|${classId}`)) {
      problems.push({ line: lineOf(index), reason: `${firstName} ${lastName} est déjà dans ${className}` });
      return;
    }
    valid.push({ lastName, firstName, className });
  });
  return { valid, problems, fatal: null };
}

// Colonnes qui ne sont pas des matières (le fichier exporté par l'application contient « Moyenne »)
const NON_SUBJECT_COLUMNS = new Set(['nom', 'prenom', 'classe', 'moyenne', 'rang', 'mention']);

/**
 * Import de notes d'une classe : colonnes Nom, Prénom puis une colonne par matière (nom de la matière).
 * `students` : les élèves de la classe choisie. Renvoie
 * { updates: [{ studentId, subjectId, value }], problems: [{ line, reason }], ignoredColumns, fatal }.
 */
export function parseGradeRows(rawRows, { students = [], subjects = [] } = {}) {
  const rows = rawRows.map(remap);
  const none = { updates: [], problems: [], ignoredColumns: [] };
  if (rows.length === 0) return { ...none, fatal: 'Le fichier est vide.' };
  const columns = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  if (!columns.includes('nom') || !columns.includes('prenom')) {
    return { ...none, fatal: 'La première ligne doit contenir les colonnes « Nom » et « Prénom », puis une colonne par matière.' };
  }

  const subjectByColumn = new Map(subjects.map((s) => [normalizeText(s.name), s]));
  const subjectColumns = columns.filter((c) => subjectByColumn.has(c));
  if (subjectColumns.length === 0) {
    return { ...none, fatal: `Aucune colonne ne correspond à une matière. Matières attendues : ${subjects.map((s) => s.name).join(', ') || '(aucune matière créée)'}.` };
  }
  const ignoredColumns = columns.filter((c) => !subjectByColumn.has(c) && !NON_SUBJECT_COLUMNS.has(c));

  const byName = new Map();
  for (const s of students) {
    const key = `${normalizeText(s.lastName)}|${normalizeText(s.firstName)}`;
    byName.set(key, [...(byName.get(key) ?? []), s]);
  }

  const updates = [];
  const problems = [];
  const done = new Set();
  rows.forEach((row, index) => {
    if (Object.values(row).every(isBlank)) return;
    const line = lineOf(index);
    const label = `${clean(row.prenom)} ${clean(row.nom)}`.trim() || 'Ligne sans nom';
    const matches = byName.get(`${normalizeText(row.nom)}|${normalizeText(row.prenom)}`) ?? [];
    if (matches.length === 0) { problems.push({ line, reason: `${label} : élève introuvable dans cette classe` }); return; }
    if (matches.length > 1) { problems.push({ line, reason: `${label} : plusieurs élèves portent ce nom, notes non importées` }); return; }
    const student = matches[0];
    if (done.has(student.id)) { problems.push({ line, reason: `${label} apparaît déjà plus haut dans le fichier` }); return; }
    done.add(student.id);

    for (const column of subjectColumns) {
      const parsed = parseGradeValue(row[column]);
      if (parsed.empty) continue;
      if (parsed.error) { problems.push({ line, reason: `${label}, ${subjectByColumn.get(column).name} : ${parsed.error}` }); continue; }
      updates.push({ studentId: student.id, subjectId: subjectByColumn.get(column).id, value: parsed.value });
    }
  });
  return { updates, problems, ignoredColumns, fatal: null };
}

/** Résumé des premières lignes ignorées pour la notification : « ligne 4 : … ; ligne 7 : … … et N autre(s) ». */
export function summarizeProblems(problems, max = 3) {
  if (!problems.length) return '';
  const shown = problems.slice(0, max).map((p) => `ligne ${p.line} : ${p.reason}`);
  const rest = problems.length - shown.length;
  return `${shown.join(' ; ')}${rest > 0 ? ` … et ${rest} autre(s)` : ''}`;
}

/**
 * Choisit comment faire lire un fichier à la bibliothèque Excel. Un classeur (.xlsx = archive « PK », .xls = format OLE)
 * est lu tel quel. Tout autre fichier est du texte (CSV) : on le décode nous-mêmes, car la bibliothèque suppose du
 * Windows-1252 et déformerait les accents d'un CSV en UTF-8 sans BOM (Google Sheets, LibreOffice) — « Prénom » devenait
 * « PrÃ©nom » et la colonne n'était plus reconnue. UTF-8 d'abord (strict), à défaut Windows-1252 (Excel en français).
 */
export function workbookInput(bytes) {
  const startsWith = (...sig) => sig.every((b, i) => bytes[i] === b);
  if (startsWith(0x50, 0x4b) || startsWith(0xd0, 0xcf, 0x11, 0xe0)) return { data: bytes, type: 'array' };
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    text = new TextDecoder('windows-1252').decode(bytes);
  }
  return { data: text.replace(/^\uFEFF/, ''), type: 'string' };
}
