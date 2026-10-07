/**
 * Partage d'un bulletin par WhatsApp via un lien "click to chat" (wa.me).
 * Aucune clé ni API : le lien ouvre WhatsApp avec le message pré-rempli, et c'est la
 * personne qui clique sur « Envoyer ». Le bulletin PDF, lui, reste à envoyer à la main
 * (un lien wa.me ne peut pas joindre de fichier).
 */

/**
 * Normalise un numéro pour wa.me : uniquement des chiffres, avec l'indicatif pays.
 * - "+228 90 12 34 56" ou "00228…" → "22890123456"
 * - "90123456" (8 chiffres, sans indicatif) → préfixé par `defaultDialCode`
 * - tout le reste (trop court, ambigu, vide) → null : on ne devine pas
 */
export function normalizeWhatsappNumber(phone, defaultDialCode = '228') {
    if (phone === null || phone === undefined) return null;
    const raw = String(phone).trim();
    if (!raw) return null;

    const hasPrefix = raw.startsWith('+') || raw.startsWith('00');
    let digits = raw.replace(/\D/g, '');
    if (raw.startsWith('00')) digits = digits.slice(2);

    if (!hasPrefix) {
        if (digits.length !== 8) return null;
        digits = `${defaultDialCode}${digits}`;
    }
    return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

const formatAverage = (average) => {
    const value = parseFloat(average);
    return Number.isNaN(value) ? '-' : value.toFixed(2);
};

/** Texte du message envoyé au parent. */
export function buildBulletinMessage({
    student, className, trimester, average, mentionText, rank, outOf, schoolName,
}) {
    const name = `${student.firstName} ${student.lastName}`.trim();
    const lines = [
        `Bonjour, voici les résultats de ${name}${className ? ` (${className})` : ''}`,
        `pour le trimestre ${trimester} :`,
        '',
        `• Moyenne générale : ${formatAverage(average)}/20`,
    ];
    if (mentionText) lines.push(`• Mention : ${mentionText}`);
    if (rank && outOf) lines.push(`• Rang : ${rank}/${outOf}`);
    lines.push('', `Le bulletin détaillé est disponible à l'école.`);
    if (schoolName) lines.push(schoolName);
    return lines.join('\n');
}

/** Lien wa.me prêt à ouvrir, ou null si le numéro est inutilisable. */
export function buildWhatsappLink(phone, message, defaultDialCode = '228') {
    const number = normalizeWhatsappNumber(phone, defaultDialCode);
    if (!number) return null;
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
