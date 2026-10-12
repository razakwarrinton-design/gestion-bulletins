// Sauvegarde des données de la base Supabase dans des fichiers JSON (un par table) + un manifeste avec le
// nombre de lignes de chaque table, puis vérification de l'intégrité d'une sauvegarde.
//
//   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... node scripts/backup-data.mjs
//   node scripts/backup-data.mjs --verify backups/2026-10-11T10-00-00
//
// ⚠️ La clé « service_role » donne accès à TOUTES les données et contourne les règles d'accès : ne la mettez
// jamais dans une variable VITE_ (elle serait publiée dans l'application) ni dans un fichier suivi par git. Passez-la
// seulement en variable d'environnement de la commande. Le dossier backups/ contient des données d'élèves : il est
// ignoré par git ; stockez-le chiffré et hors de l'ordinateur de travail.
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Tables sauvegardées, avec les colonnes qui fixent un ordre stable pour la pagination. */
export const TABLES = [
  { name: 'app_data', order: 'key' },
  { name: 'classes', order: 'id' },
  { name: 'subjects', order: 'id' },
  { name: 'students', order: 'id' },
  { name: 'grades', order: 'id' },
  { name: 'absences', order: 'id' },
  { name: 'appreciations', order: 'id' },
  { name: 'activities', order: 'id' },
  { name: 'user_profiles', order: 'id' },
  { name: 'parent_students', order: 'parent_id,student_id' },
  { name: 'fee_types', order: 'id' },
  { name: 'payments', order: 'id' },
  { name: 'conversations', order: 'id' },
  { name: 'messages', order: 'id' },
  { name: 'audit_logs', order: 'id' },
  { name: 'client_errors', order: 'id' },
];

export const PAGE_SIZE = 1000;

/**
 * Lit toutes les lignes d'une table, page par page. `fetchPage(offset, limit)` renvoie { rows, total } où `total` est le
 * nombre de lignes de la table si le serveur le dit (sinon null). Le serveur peut renvoyer des pages plus courtes que
 * demandé (limite de lignes du projet) : on avance donc de ce qui a été reçu, et on ne s'arrête que quand le total est
 * atteint. Une table n'est jamais tronquée en silence : un écart avec le total lève une erreur.
 */
export async function readAll(fetchPage, { pageSize = PAGE_SIZE, maxRows = 5_000_000 } = {}) {
  const rows = [];
  let total = null;
  while (rows.length < maxRows) {
    const page = await fetchPage(rows.length, pageSize);
    if (page.total != null) total = page.total;
    rows.push(...page.rows);
    const done = page.rows.length === 0 || (total != null ? rows.length >= total : page.rows.length < pageSize);
    if (done) {
      if (total != null && rows.length !== total) throw new Error(`${rows.length} lignes lues sur ${total} attendues`);
      return rows;
    }
  }
  throw new Error(`Plus de ${maxRows} lignes : lecture interrompue`);
}

/**
 * Une table qui n'existe simplement pas dans cette installation (script facultatif non exécuté) est la seule erreur
 * qu'on a le droit d'ignorer. Toute autre erreur (droits, colonne de tri fausse, panne du serveur) est un échec.
 */
export function isAbsentTable(status, body) {
  return status === 404 || /PGRST205|42P01|Could not find the table|relation "[^"]*" does not exist/i.test(String(body ?? ''));
}

/** Manifeste : date, et pour chaque table son nombre de lignes, « absente » (ignorable) ou l'erreur rencontrée. */
export function buildManifest(results, now = new Date()) {
  const entry = (r) => {
    if (r.absent) return { absent: true };
    if (r.error) return { error: r.error };
    return { rows: r.rows.length };
  };
  return { createdAt: now.toISOString(), tables: Object.fromEntries(results.map((r) => [r.name, entry(r)])) };
}

/**
 * Compare une sauvegarde à son manifeste. `readTable(name)` renvoie les lignes du fichier de la table (ou null s'il
 * est absent). Renvoie la liste des problèmes (vide : sauvegarde cohérente).
 */
export function verifyManifest(manifest, readTable) {
  const problems = [];
  for (const [name, info] of Object.entries(manifest.tables ?? {})) {
    if (info.absent) continue; // table absente de cette installation (script facultatif non exécuté)
    if (info.error) { problems.push(`${name} : lecture échouée (${info.error})`); continue; }
    const rows = readTable(name);
    if (!Array.isArray(rows)) problems.push(`${name} : fichier manquant ou illisible`);
    else if (rows.length !== info.rows) problems.push(`${name} : ${rows.length} lignes dans le fichier, ${info.rows} attendues`);
  }
  return problems;
}

async function fetchTablePage(baseUrl, key, table, offset, limit) {
  const url = `${baseUrl}/rest/v1/${table.name}?select=*&order=${table.order}`;
  const response = await fetch(url, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact', Range: `${offset}-${offset + limit - 1}`, 'Range-Unit': 'items' },
  });
  // 416 : plage hors de la table (table vide) — il n'y a simplement plus de lignes
  if (response.status === 416) return { rows: [], total: null };
  if (!response.ok) {
    const body = await response.text();
    throw Object.assign(new Error(`${response.status} ${body.slice(0, 200)}`), { status: response.status, body });
  }
  // Content-Range : « 0-999/2345 » (ou « */0 » pour une table vide)
  const match = /\/(\d+)$/.exec(response.headers.get('content-range') ?? '');
  const total = match ? Number(match[1]) : null;
  return { rows: await response.json(), total: Number.isFinite(total) ? total : null };
}

async function backup() {
  const baseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !key) {
    console.error('Il faut SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY (variables d\'environnement de la commande).');
    process.exit(1);
  }
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const dir = path.join(root, 'backups', new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19));
  mkdirSync(dir, { recursive: true });

  const results = [];
  for (const table of TABLES) {
    try {
      const rows = await readAll((offset, limit) => fetchTablePage(baseUrl, key, table, offset, limit));
      writeFileSync(path.join(dir, `${table.name}.json`), JSON.stringify(rows));
      results.push({ name: table.name, rows });
      console.log(`✓ ${table.name} : ${rows.length} ligne(s)`);
    } catch (error) {
      if (isAbsentTable(error.status, error.body)) {
        results.push({ name: table.name, absent: true });
        console.warn(`– ${table.name} : absente de cette installation, ignorée`);
      } else {
        results.push({ name: table.name, error: error.message });
        console.error(`✗ ${table.name} : ÉCHEC (${error.message})`);
      }
    }
  }
  writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(buildManifest(results), null, 2));
  const failed = results.filter((r) => r.error).map((r) => r.name);
  console.log(`\nSauvegarde écrite dans ${dir}`);
  if (failed.length) {
    console.error(`SAUVEGARDE INCOMPLÈTE : ${failed.join(', ')} n'ont pas pu être lues. Ne la considérez pas comme une sauvegarde.`);
    process.exitCode = 1;
    return;
  }
  console.log('Vérifiez-la : node scripts/backup-data.mjs --verify "' + dir + '"');
}

function verify(dir) {
  const manifestPath = path.join(dir, 'manifest.json');
  if (!existsSync(manifestPath)) {
    console.error(`Pas de manifest.json dans ${dir}`);
    process.exit(1);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const problems = verifyManifest(manifest, (name) => {
    try { return JSON.parse(readFileSync(path.join(dir, `${name}.json`), 'utf8')); } catch { return null; }
  });
  if (problems.length) {
    console.error(`Sauvegarde INCOHÉRENTE :\n- ${problems.join('\n- ')}`);
    process.exit(1);
  }
  console.log(`Sauvegarde cohérente (${Object.keys(manifest.tables).length} tables, créée le ${manifest.createdAt}).`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const verifyIndex = process.argv.indexOf('--verify');
  if (verifyIndex >= 0) verify(process.argv[verifyIndex + 1] ?? '');
  else await backup();
}
