// Supabase simulé pour les tests de bout en bout : session déjà ouverte, données de classe en mémoire, aucune
// requête réelle. L'application est construite avec VITE_SUPABASE_URL=https://e2e.supabase.co (playwright.config.js).
const REF = 'e2e'; // sous-domaine de l'adresse factice : le client Supabase range la session sous « sb-e2e-auth-token »

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

const SUBJECT_NAMES = [
  'Mathématiques', 'Français', 'Anglais', 'Histoire-Géographie', 'SVT', 'Physique-Chimie', 'EPS',
  'Éducation civique', 'Informatique', 'Philosophie', 'Allemand', 'Espagnol', 'Dessin', 'Musique',
];

/** Jeu de données : une classe, des élèves, des matières et une note par élève et par matière (trimestre 1). */
export function buildData({ subjectCount = 6, studentCount = 8 } = {}) {
  const subjects = Array.from({ length: subjectCount }, (_, i) => ({
    id: i + 1, name: SUBJECT_NAMES[i % SUBJECT_NAMES.length], coefficient: (i % 3) + 1,
  }));
  const students = Array.from({ length: studentCount }, (_, i) => ({
    id: i + 1, first_name: `Prénom${i + 1}`, last_name: `Nom${i + 1}`, class_id: 1,
  }));
  const grades = students.flatMap((s) => subjects.map((sub) => ({
    id: `g${s.id}-${sub.id}`, student_id: s.id, subject_id: sub.id, trimester: '1', academic_year: '2026-2027',
    value: 6 + ((s.id * 3 + sub.id * 5) % 13), teacher_name: 'M. Kodjo',
  })));
  return { classes: [{ id: 1, name: '6ème A' }], subjects, students, grades };
}

/**
 * Ouvre une session simulée dans le contexte du navigateur et répond à toutes les requêtes Supabase.
 * `role` : rôle du compte (admin, professeur, parent…). Renvoie la liste des appels non prévus (doit rester vide).
 */
export async function mockSupabase(context, { role = 'admin', data = buildData() } = {}) {
  const exp = Math.floor(Date.now() / 1000) + 24 * 3600;
  const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u-1', aud: 'authenticated', role: 'authenticated', exp })}.sig`;
  const user = {
    id: 'u-1', aud: 'authenticated', role: 'authenticated', email: 'admin@ecole.test',
    app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z',
  };
  const session = { access_token: jwt, refresh_token: 'r', expires_at: exp, expires_in: 3600, token_type: 'bearer', user };
  const profile = { id: 'u-1', email: 'admin@ecole.test', first_name: 'Awa', last_name: 'Kossi', role, status: 'active' };

  await context.addInitScript(([key, value]) => {
    try { localStorage.setItem(key, value); } catch { /* stockage indisponible */ }
  }, [`sb-${REF}-auth-token`, JSON.stringify(session)]);

  const unexpected = [];
  await context.route(/supabase\.co/, async (route) => {
    const url = new URL(route.request().url());
    const wantsObject = (route.request().headers().accept || '').includes('vnd.pgrst.object');
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (url.pathname.startsWith('/auth/v1/user')) return json(user);
    if (url.pathname.startsWith('/auth/v1/')) return json({});
    if (url.pathname.startsWith('/rest/v1/rpc/')) return json([]);
    if (url.pathname.startsWith('/rest/v1/')) {
      const table = url.pathname.split('/').pop();
      if (table === 'user_profiles') return json(wantsObject ? profile : [profile]);
      const rows = data[table] ?? [];
      if (wantsObject) return rows[0] ? json(rows[0]) : json({ message: 'no rows' }, 406);
      return json(rows);
    }
    unexpected.push(url.href);
    return json({});
  });
  return unexpected;
}
