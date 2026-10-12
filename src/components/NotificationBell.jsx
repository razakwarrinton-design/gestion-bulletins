import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { formatAge, linkTarget } from '../utils/notifications';

/**
 * Cloche de la barre du haut : nombre de notifications non lues et liste déroulante.
 * `notifications` vient de useNotifications ; `allowedViews` limite les liens aux écrans du compte.
 */
const NotificationBell = ({ notifications, allowedViews = [], onNavigate }) => {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const { items, unread, markRead, markAllRead } = notifications;

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => { if (root.current && !root.current.contains(event.target)) setOpen(false); };
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onPointer); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const choose = (item) => {
    markRead(item.id);
    const view = linkTarget(item, allowedViews);
    if (view && onNavigate) { onNavigate(view); setOpen(false); }
  };

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unread > 0 ? `Notifications, ${unread} non lue${unread > 1 ? 's' : ''}` : 'Notifications'}
        className="relative p-2 rounded-lg text-gray-500 hover:bg-blue-50 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold leading-[18px] text-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          // petit écran : panneau pleine largeur sous la barre ; grand écran : rattaché à la cloche
          className="fixed left-3 right-3 top-14 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 z-50 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">Notifications</h2>
            {unread > 0 && (
              <button type="button" onClick={markAllRead} className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800">
                <CheckCheck className="w-3.5 h-3.5" /> Tout marquer comme lu
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-8 text-sm text-gray-600 text-center">Aucune notification pour le moment.</p>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto divide-y divide-gray-100">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => choose(item)}
                    className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-blue-50 ${item.read_at ? '' : 'bg-blue-50/60'}`}
                  >
                    <span aria-hidden="true" className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${item.read_at ? 'bg-transparent' : 'bg-blue-600'}`} />
                    <span className="min-w-0">
                      <span className={`block text-sm text-gray-900 ${item.read_at ? 'font-medium' : 'font-bold'}`}>{item.title}</span>
                      <span className="block text-sm text-gray-600">{item.body}</span>
                      <span className="block text-xs text-gray-500 mt-0.5">{formatAge(item.created_at)}{item.read_at ? '' : ' · non lue'}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
