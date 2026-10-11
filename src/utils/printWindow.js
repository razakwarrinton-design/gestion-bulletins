import { prepareBulletinHtml } from './printSecurity';

/**
 * Ouvre un document dans une fenêtre d'impression, après nettoyage et politique de sécurité (voir printSecurity.js).
 * Renvoie false si le navigateur a bloqué la fenêtre.
 */
export function openPrintWindow(html) {
  const win = window.open('', '_blank', 'width=1100,height=800');
  if (!win) return false;
  win.document.write(prepareBulletinHtml(html));
  win.document.close();
  setTimeout(() => { win.print(); setTimeout(() => win.close(), 600); }, 450);
  return true;
}
