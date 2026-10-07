/**
 * Les identifiants venant de la base peuvent être des nombres (BIGSERIAL) alors qu'un <select>
 * renvoie toujours du texte : `student.classId === selectedClass` est alors faux pour tout le
 * monde et les listes restent vides.
 */

/** Retrouve l'identifiant d'origine (nombre ou texte) à partir de la valeur d'un <select>. */
export function resolveId(items, value) {
    if (value === null || value === undefined || value === '') return null;
    const match = items.find(item => String(item.id) === String(value));
    return match ? match.id : null;
}

/** Égalité d'identifiants indépendante du type (1 et "1" désignent le même élément). */
export function sameId(a, b) {
    if (a === null || a === undefined || b === null || b === undefined) return false;
    return String(a) === String(b);
}
