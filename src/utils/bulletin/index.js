import { renderModel1 } from './model1';
import { renderModel2 } from './model2';
import { renderModel3 } from './model3';

export { buildBulletinContext } from './context';

export const BULLETIN_TEMPLATES = [
  { id: 'model1', label: 'Modèle Officiel' },
  { id: 'model2', label: 'Modèle Moderne' },
  { id: 'model3', label: 'Modèle Premium' },
];

/** HTML d'un bulletin selon le modèle (model1 par défaut). */
export function renderBulletin(template, c, s, sGrades, sAvg, sRank, sStatus, sMention, sTotalCoef, sTotalPts) {
  if (template === 'model2') return renderModel2(c, s, sGrades, sAvg, sRank, sStatus, sMention, sTotalCoef);
  if (template === 'model3') return renderModel3(c, s, sGrades, sAvg, sRank, sStatus, sMention, sTotalCoef, sTotalPts);
  return renderModel1(c, s, sGrades, sAvg, sRank, sStatus, sMention, sTotalCoef, sTotalPts);
}
