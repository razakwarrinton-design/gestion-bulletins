import { Megaphone, Wallet, ScrollText, CalendarClock } from 'lucide-react';
import { categoryLabel, deadlineText, formatFcfa, isRecent } from '../utils/announcements';

const STYLES = {
  frais: { Icon: Wallet, badge: 'bg-amber-100 text-amber-800', border: 'border-amber-200' },
  reglement: { Icon: ScrollText, badge: 'bg-indigo-100 text-indigo-800', border: 'border-indigo-200' },
  autre: { Icon: Megaphone, badge: 'bg-blue-100 text-blue-800', border: 'border-blue-200' },
};

const ROLE_LABELS = { admin: 'Direction', professeur: 'Professeur', secretaire: 'Secrétariat' };

/**
 * Une info de l'établissement. Le texte est affiché tel quel (retours à la ligne conservés), jamais interprété comme du HTML.
 * `className` : nom de la classe visée (vide = tout l'établissement) ; `actions` : boutons du personnel.
 */
export default function AnnouncementCard({ item, className, actions }) {
  const style = STYLES[item.category] ?? STYLES.autre;
  const { Icon } = style;
  const deadline = deadlineText(item.deadline);
  const edited = item.updated_at && new Date(item.updated_at).getTime() - new Date(item.created_at).getTime() > 60000;
  const author = [item.author_name, ROLE_LABELS[item.author_role]].filter(Boolean);

  return (
    <article className={`bg-white rounded-2xl border ${style.border} p-4 space-y-2`}>
      <header className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${style.badge}`}>
          <Icon className="w-3.5 h-3.5" aria-hidden="true" /> {categoryLabel(item.category)}
        </span>
        {isRecent(item.created_at) && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white">Nouveau</span>}
        <span className="text-xs text-gray-600">{className ? `Classe ${className}` : "Tout l'établissement"}</span>
        {actions && <span className="ml-auto flex gap-2">{actions}</span>}
      </header>

      <h3 className="text-base font-bold text-gray-900 break-words">{item.title}</h3>

      {item.amount_fcfa != null && (
        <p className="text-lg font-black text-amber-800">
          {formatFcfa(item.amount_fcfa)}
          <span className="ml-2 text-xs font-medium text-gray-600">montant indicatif annoncé par l'établissement</span>
        </p>
      )}
      {deadline && (
        <p className={`flex items-center gap-1.5 text-sm font-semibold ${deadline.late ? 'text-red-700' : 'text-gray-800'}`}>
          <CalendarClock className="w-4 h-4" aria-hidden="true" /> {deadline.text}
        </p>
      )}

      <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{item.body}</p>

      <footer className="text-xs text-gray-600">
        Publié le {new Date(item.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
        {author.length > 0 && ` par ${author.join(' · ')}`}
        {edited && ` · modifié le ${new Date(item.updated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`}
      </footer>
    </article>
  );
}
