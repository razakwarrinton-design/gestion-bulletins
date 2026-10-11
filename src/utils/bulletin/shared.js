// Éléments communs aux trois modèles de bulletin : mise en page d'impression, échappement du texte,
// rang en ordinal et légende de lecture.
import { MENTION_LEVELS } from '../mentions';
import { getMention } from '../grades';

/** Au-delà de ce nombre de matières, le bulletin passe en mise en page compacte pour tenir sur une page A4. */
export const DENSE_FROM_ROWS = 11;

/** Texte inséré dans le HTML : `&`, `<`, `>` et guillemets neutralisés (un nom comme « <b> » ne casse plus la page). */
export const esc = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

/** « 1er », « 2e »… ; une valeur non numérique (« - » pour un élève sans note) est conservée telle quelle. */
export function ordinalRank(rank) {
  const n = Number(rank);
  if (!Number.isInteger(n) || n < 1) return esc(rank);
  return n === 1 ? '1er' : `${n}e`;
}

/**
 * Règles d'impression communes, à insérer dans la feuille de style de chaque modèle :
 * - les couleurs de fond sont imprimées (sans cela, un en-tête bleu à texte blanc s'imprime blanc sur blanc
 *   quand l'option « graphiques d'arrière-plan » du navigateur est décochée) ;
 * - l'en-tête d'un tableau est répété si le bulletin déborde sur une seconde page ;
 * - une ligne, un cadre ou une signature n'est jamais coupé en deux pages.
 */
export const PRINT_CSS = `
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }
  tr, .keep { break-inside: avoid; page-break-inside: avoid; }
  p { orphans: 3; widows: 3; }
  .scale-legend { font-size: 6.3pt; line-height: 1.5; color: #64748b; margin: 3px 0 6px; }
  .scale-legend b { color: #334155; font-weight: 700; }
  .hand-lines { min-height: 15mm; background-image: repeating-linear-gradient(transparent 0, transparent 6.3mm, #cbd5e1 6.3mm, #cbd5e1 6.6mm); }`;

const DISTINCTION_THRESHOLDS = [18, 16, 14, 12, 10];
const DECISION_THRESHOLDS = [12, 8];

/**
 * Légende « comment lire ce bulletin » : les seuils sont lus dans les fonctions qui produisent les mentions
 * (jamais recopiés), donc la légende reste exacte si un barème change.
 * `withSubjectLevels` ajoute le barème des niveaux par matière (modèles qui affichent un niveau par ligne).
 */
export function scaleLegend({ withSubjectLevels = false, decisionFor }) {
  const lines = [];
  if (withSubjectLevels) {
    const levels = MENTION_LEVELS.map((level, i) => (i < MENTION_LEVELS.length - 1
      ? `${level.label} ≥ ${level.min}`
      : `${level.label} &lt; ${MENTION_LEVELS[i - 1].min}`));
    lines.push(`<b>Niveau par matière :</b> ${levels.join(' · ')}`);
  }
  const distinctions = [
    ...DISTINCTION_THRESHOLDS.map((v) => `${getMention(v).text} ≥ ${v}`),
    `${getMention(0).text} &lt; ${DISTINCTION_THRESHOLDS[DISTINCTION_THRESHOLDS.length - 1]}`,
  ];
  lines.push(`<b>Mention (moyenne générale) :</b> ${distinctions.join(' · ')}`);
  if (decisionFor) {
    const decisions = [
      ...DECISION_THRESHOLDS.map((v) => `${decisionFor(v).text} ≥ ${v}`),
      `${decisionFor(0).text} &lt; ${DECISION_THRESHOLDS[DECISION_THRESHOLDS.length - 1]}`,
    ];
    lines.push(`<b>Décision :</b> ${decisions.join(' · ')}`);
  }
  return `<div class="scale-legend keep">${lines.join('<br>')}</div>`;
}
