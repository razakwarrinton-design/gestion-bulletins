/**
 * Champs de profil d'un élève saisis dans StudentModal (date de naissance, sexe, photo,
 * contact d'urgence). Colonnes ajoutées par sql/students-profile.sql.
 */
const PROFILE_FIELDS = {
    birthDate: 'birth_date',
    gender: 'gender',
    photoUrl: 'photo_url',
    emergencyName: 'emergency_name',
    emergencyPhone: 'emergency_phone',
    emergencyRelation: 'emergency_relation',
    // accès des parents au bulletin (sql/bulletin-access.sql) ; modifiable seulement par le personnel
    bulletinAccess: 'bulletin_access',
};

/** Ligne Supabase (snake_case) → objet élève de l'application (camelCase). */
export function mapStudentRow(row) {
    const student = {
        ...row,
        firstName: row.first_name,
        lastName: row.last_name,
        classId: row.class_id,
    };
    for (const [camel, snake] of Object.entries(PROFILE_FIELDS)) {
        if (snake in row) student[camel] = row[snake];
    }
    return student;
}

/**
 * Construit les colonnes de profil à envoyer à Supabase.
 *
 * - une clé absente (undefined) n'est jamais envoyée ;
 * - à la création, une valeur vide (null) n'est pas envoyée : un formulaire vide ne
 *   casse pas l'enregistrement tant que la migration n'est pas appliquée ;
 * - à la modification, une valeur vide efface la colonne… sauf si la colonne n'existe
 *   pas encore en base (absente de la ligne lue), pour ne pas bloquer une simple
 *   correction de nom.
 *
 * @param {object} profile  champs camelCase issus du formulaire
 * @param {object|null} existing  élève déjà chargé (modification), sinon null
 */
export function buildStudentProfilePayload(profile = {}, existing = null) {
    const payload = {};
    for (const [camel, snake] of Object.entries(PROFILE_FIELDS)) {
        const value = profile[camel];
        if (value === undefined) continue;
        const columnKnown = existing ? snake in existing : false;
        if (value === null && !columnKnown) continue;
        // la colonne d'accès au bulletin n'est jamais envoyée tant qu'elle n'existe pas en base
        if (camel === 'bulletinAccess' && !columnKnown) continue;
        payload[snake] = value;
    }
    return payload;
}
