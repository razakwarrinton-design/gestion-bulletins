// Fonctions pures de la cloche de notifications (voir sql/notifications.sql).

/** Table absente : sql/notifications.sql n'a pas encore été exécuté. La cloche reste alors cachée (fonction désactivée). */
export function isAbsentTable(error) {
  return ['42P01', 'PGRST205'].includes(error?.code) || /relation .*notifications.* does not exist|table .*notifications/i.test(String(error?.message ?? ''));
}

/** Notifications apparues depuis la dernière lecture : non lues et plus récentes que `lastSeenId`. */
export function newArrivals(items, lastSeenId) {
  return items.filter((item) => !item.read_at && Number(item.id) > lastSeenId);
}

export function maxId(items) {
  return items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
}

/** « à l'instant », « il y a 5 min », « il y a 3 h », « hier », puis la date. */
export function formatAge(iso, now = Date.now()) {
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return '';
  const minutes = Math.max(0, Math.round((now - time) / 60000));
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'hier';
  if (days < 7) return `il y a ${days} jours`;
  return new Date(time).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

/** Écran vers lequel mène une notification, seulement s'il est accessible au compte (une valeur de la base ne contourne pas les rôles). */
export function linkTarget(item, allowedViews) {
  return item?.link_view && allowedViews.includes(item.link_view) ? item.link_view : null;
}
