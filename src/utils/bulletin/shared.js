// Éléments communs aux trois modèles de bulletin : mise en page d'impression, échappement du texte,
// rang en ordinal et légende de lecture.
import { mentionLevels } from '../mentions';
import { getMention, decisionFor as defaultDecisionFor } from '../grades';
import { getScale } from '../gradingScale';

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

/** Seuil affiché comme dans un bulletin français : virgule décimale, pas de zéros inutiles. */
const fmtThreshold = (v) => String(v).replace('.', ',');

/**
 * Légende « comment lire ce bulletin » : les seuils sont ceux du barème de l'école (utils/gradingScale.js),
 * lus au moment de l'impression, et les libellés viennent des fonctions qui produisent les mentions.
 * `withSubjectLevels` ajoute le barème des niveaux par matière (modèles qui affichent un niveau par ligne).
 */
export function scaleLegend({ withSubjectLevels = false, decisionFor = defaultDecisionFor } = {}) {
  const { cutoffs, difficulty, admission } = getScale();
  const lines = [];
  if (withSubjectLevels) {
    const levels = mentionLevels();
    const parts = levels.map((level, i) => (i < levels.length - 1
      ? `${level.label} ≥ ${fmtThreshold(level.min)}`
      : `${level.label} &lt; ${fmtThreshold(levels[i - 1].min)}`));
    lines.push(`<b>Niveau par matière :</b> ${parts.join(' · ')}`);
  }
  const distinctions = [
    ...cutoffs.map((v) => `${getMention(v).text} ≥ ${fmtThreshold(v)}`),
    `${getMention(0).text} &lt; ${fmtThreshold(cutoffs[cutoffs.length - 1])}`,
  ];
  lines.push(`<b>Mention (moyenne générale) :</b> ${distinctions.join(' · ')}`);
  const decisions = [
    `${decisionFor(admission).text} ≥ ${fmtThreshold(admission)}`,
    `${decisionFor(difficulty).text} ≥ ${fmtThreshold(difficulty)}`,
    `${decisionFor(-1).text} &lt; ${fmtThreshold(difficulty)}`,
  ];
  lines.push(`<b>Décision :</b> ${decisions.join(' · ')}`);
  return `<div class="scale-legend keep">${lines.join('<br>')}</div>`;
}
