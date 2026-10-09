import { renderModel1 } from './model1';
import { renderModel2 } from './model2';
import { renderModel3 } from './model3';

export { buildBulletinContext } from './context';

export const BULLETIN_TEMPLATES = [
  { id: 'model1', label: 'Modèle Officiel' },
  { id: 'model2', label: 'Modèle Moderne' },
  { id: 'model3', label: 'Modèle Premium' },
];

/**
 * Nom de fichier proposé par « Enregistrer en PDF » : le navigateur reprend le titre de la page imprimée.
 * Ex. fileTitle('Bulletin', 'Mensah', 'Koffi', 'T1', '2026-2027') → « Bulletin_Mensah_Koffi_T1_2026-2027 ».
 * Les caractères interdits dans un nom de fichier sont retirés, les espaces deviennent des « _ ».
 */
export function fileTitle(...parts) {
  return parts
    .map((p) => String(p ?? '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').trim().replace(/\s+/g, '_'))
    .filter(Boolean)
    .join('_')
    .slice(0, 120);
}

/** Remplace le <title> d'un document HTML (le texte est échappé). */
export function withDocumentTitle(html, title) {
  const safe = String(title).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return html.replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${safe}</title>`);
}

/** HTML d'un bulletin selon le modèle (model1 par défaut). */
export function renderBulletin(template, c, s, sGrades, sAvg, sRank, sStatus, sMention, sTotalCoef, sTotalPts) {
  if (template === 'model2') return renderModel2(c, s, sGrades, sAvg, sRank, sStatus, sMention, sTotalCoef);
  if (template === 'model3') return renderModel3(c, s, sGrades, sAvg, sRank, sStatus, sMention, sTotalCoef, sTotalPts);
  return renderModel1(c, s, sGrades, sAvg, sRank, sStatus, sMention, sTotalCoef, sTotalPts);
}
