import { Megaphone } from 'lucide-react';
import AnnouncementCard from './AnnouncementCard';
import { isRecent } from '../utils/announcements';

/** Liste des infos de l'établissement dans l'espace parent (déjà filtrées par la base : établissement + classe des enfants). */
export function AnnouncementsList({ announcements, classNames = {} }) {
  const { items, loading, error, installed } = announcements;
  if (!installed) {
    return <p className="text-sm text-gray-600 bg-white rounded-2xl border border-gray-100 p-6 text-center">Les infos de l'établissement ne sont pas encore disponibles.</p>;
  }
  if (loading) return <p className="text-sm text-gray-600">Chargement…</p>;
  if (error) return <p role="alert" className="text-sm text-red-700">Lecture impossible : {error}</p>;
  if (items.length === 0) {
    return <p className="text-sm text-gray-600 bg-white rounded-2xl border border-gray-100 p-6 text-center">Aucune info publiée par l'établissement pour le moment.</p>;
  }
  return (
    <div className="space-y-3">
      {items.map((item) => <AnnouncementCard key={item.id} item={item} className={classNames[item.class_id]} />)}
    </div>
  );
}

/** Bandeau de la vue d'ensemble : « N nouvelles actualités de l'école » avec un bouton pour les ouvrir. */
export function AnnouncementsBanner({ announcements, onOpen }) {
  const recent = announcements.items.filter((item) => isRecent(item.created_at));
  if (!announcements.installed || recent.length === 0) return null;
  return (
    <button type="button" onClick={onOpen}
      className="w-full flex items-center gap-3 text-left bg-amber-50 border border-amber-200 rounded-2xl p-4 hover:bg-amber-100 transition-colors">
      <Megaphone className="w-5 h-5 text-amber-700 flex-shrink-0" aria-hidden="true" />
      <span className="text-sm text-amber-900">
        <strong>{recent.length} nouvelle{recent.length > 1 ? 's' : ''} actualité{recent.length > 1 ? 's' : ''} de l'école</strong>
        {' : '}{recent[0].title}{recent.length > 1 ? '…' : ''}
      </span>
    </button>
  );
}

/** Onglet « Actualités » : charge les infos une fois pour tout l'espace parent. */
export default function AnnouncementsParent({ announcements, classNames }) {
  return (
    <section aria-label="Infos de l'établissement" className="space-y-3">
      <p className="text-sm text-gray-600">
        Frais et règles publiés par la direction, les professeurs et le secrétariat. Un montant annoncé ici est une information ;
        le solde de votre enfant se consulte dans l'onglet Paiements.
      </p>
      <AnnouncementsList announcements={announcements} classNames={classNames} />
    </section>
  );
}

