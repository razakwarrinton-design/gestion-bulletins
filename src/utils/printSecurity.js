/**
 * Sécurisation du HTML des bulletins avant impression.
 *
 * Les bulletins sont construits par concaténation de texte (noms d'élèves, matières,
 * champs de l'école, appréciations) puis écrits dans une fenêtre ouverte par
 * `window.open('', '_blank')`. Cette fenêtre a la MÊME origine que l'application : un nom
 * d'élève contenant `<img onerror=…>` y exécuterait du script avec accès au localStorage de
 * la personne qui imprime, donc à sa session Supabase.
 *
 * Deux protections cumulées :
 *   1. nettoyage : suppression des éléments et attributs exécutables (script, on*, javascript:…) ;
 *   2. politique CSP en tête de document : aucun script, aucune requête réseau, aucun formulaire.
 */

export const PRINT_CSP = [
    "default-src 'none'",
    "script-src 'none'",
    "style-src 'unsafe-inline'",
    'img-src data:',
    'font-src data:',
    "base-uri 'none'",
    "form-action 'none'",
].join('; ');

const FORBIDDEN_TAGS = [
    'script', 'iframe', 'frame', 'frameset', 'object', 'embed', 'applet',
    'form', 'base', 'link', 'noscript',
];
const URL_ATTRIBUTES = ['href', 'src', 'xlink:href', 'action', 'formaction', 'data', 'poster'];

/** Une URL est-elle dangereuse ? (javascript:, vbscript:, ou data: autre qu'une image) */
export function isUnsafeUrl(value) {
    // eslint-disable-next-line no-control-regex
    const normalized = String(value).replace(/[\u0000- \u007f]/g, '').toLowerCase();
    if (normalized.startsWith('javascript:') || normalized.startsWith('vbscript:')) return true;
    if (normalized.startsWith('data:') && !normalized.startsWith('data:image/')) return true;
    return false;
}

/** Retire tout ce qui peut s'exécuter ou recharger quelque chose depuis le réseau. */
export function sanitizeBulletinHtml(html) {
    const doc = new DOMParser().parseFromString(String(html), 'text/html');

    FORBIDDEN_TAGS.forEach((tag) => doc.querySelectorAll(tag).forEach((el) => el.remove()));
    // <meta http-equiv="refresh"> et autres directives : seul le charset est conservé
    doc.querySelectorAll('meta').forEach((el) => {
        if (el.hasAttribute('http-equiv')) el.remove();
    });

    doc.querySelectorAll('*').forEach((el) => {
        for (const attr of Array.from(el.attributes)) {
            const name = attr.name.toLowerCase();
            if (name.startsWith('on')) {
                el.removeAttribute(attr.name);
            } else if (URL_ATTRIBUTES.includes(name) && isUnsafeUrl(attr.value)) {
                el.removeAttribute(attr.name);
            }
        }
    });

    return doc;
}

/** HTML prêt à écrire dans la fenêtre d'impression : nettoyé, avec CSP en première position. */
export function prepareBulletinHtml(html) {
    const doc = sanitizeBulletinHtml(html);

    const meta = doc.createElement('meta');
    meta.setAttribute('http-equiv', 'Content-Security-Policy');
    meta.setAttribute('content', PRINT_CSP);
    doc.head.insertBefore(meta, doc.head.firstChild);

    return `<!DOCTYPE html>${doc.documentElement.outerHTML}`;
}
