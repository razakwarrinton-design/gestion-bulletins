import { useState } from 'react';
import { Megaphone, Pencil, Trash2, Send, X } from 'lucide-react';
import { useAnnouncements } from '../hooks/useAnnouncements';
import AnnouncementCard from './AnnouncementCard';
import {
  BODY_MAX, CATEGORIES, TITLE_MAX, canEdit, toRow, validateAnnouncement,
} from '../utils/announcements';

const EMPTY = { title: '', body: '', category: 'frais', amount: '', deadline: '', classId: '', notify: true };

/**
 * Publication des infos de l'établissement (frais, règles) par la direction et les professeurs.
 * Les parents les lisent dans leur espace ; « Prévenir les parents » ajoute un avis dans leur cloche.
 */
export default function AnnouncementsManager({ currentUser, classes = [], openConfirm, showNotification }) {
  const { items, loading, error, installed, publish, update, remove } = useAnnouncements();
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [problem, setProblem] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const className = (id) => classes.find((c) => String(c.id) === String(id))?.name;

  const reset = () => { setForm(EMPTY); setEditingId(null); setProblem(''); };

  const submit = async (event) => {
    event.preventDefault();
    const invalid = validateAnnouncement(form);
    if (invalid) { setProblem(invalid); return; }
    setSaving(true);
    setProblem('');
    try {
      const row = toRow(form);
      if (editingId) {
        await update(editingId, row);
        showNotification?.('Info modifiée');
      } else {
        const { notified } = await publish(row, { notify: form.notify });
        showNotification?.(notified == null ? 'Info publiée' : `Info publiée · ${notified} parent${notified > 1 ? 's' : ''} prévenu${notified > 1 ? 's' : ''}`);
      }
      reset();
    } catch (err) {
      setProblem(err.message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setProblem('');
    setForm({
      title: item.title, body: item.body, category: item.category, amount: item.amount_fcfa ?? '',
      deadline: item.deadline ?? '', classId: item.class_id ?? '', notify: false,
    });
    window.scrollTo?.({ top: 0, behavior: 'smooth' });
  };

  const askDelete = (item) => openConfirm?.(
    'Supprimer cette info ?',
    `« ${item.title} » ne sera plus visible par les parents.`,
    async () => {
      try { await remove(item.id); showNotification?.('Info supprimée'); } catch (err) { showNotification?.(err.message); }
    },
  );

  if (!installed) {
    return (
      <div role="alert" className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900">
        Les infos de l'établissement ne sont pas encore installées : exécutez <strong>sql/announcements.sql</strong> dans l'éditeur SQL de Supabase
        (après <strong>sql/notifications.sql</strong>), puis rechargez la page.
      </div>
    );
  }

  const input = 'w-full p-2.5 border border-blue-100 bg-blue-50 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none';
  const label = 'block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5';

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2 whitespace-nowrap">
          <Megaphone className="w-5 h-5 text-blue-600" /> Infos aux parents
        </h2>
        <p className="text-sm text-gray-600 mt-0.5">
          Publiez ici les frais (relevés, documents…) et les règles de l'établissement : les parents les consultent dans leur espace,
          sans dépendre de ce que l'élève rapporte.
        </p>
      </div>

      <form onSubmit={submit} className="bg-white rounded-2xl border border-blue-100 p-4 space-y-4" aria-label={editingId ? "Modifier l'info" : 'Nouvelle info'}>
        <h3 className="text-sm font-bold text-gray-900">{editingId ? "Modifier l'info" : 'Nouvelle info'}</h3>

        <fieldset>
          <legend className={label}>Type</legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <label key={c.key} title={c.hint}
                className={`px-3 py-1.5 rounded-xl text-sm font-semibold cursor-pointer border ${form.category === c.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'}`}>
                <input type="radio" name="category" value={c.key} checked={form.category === c.key}
                  onChange={() => set({ category: c.key, amount: c.key === 'frais' ? form.amount : '' })} className="sr-only" />
                {c.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="ann-title" className={label}>Titre</label>
          <input id="ann-title" className={input} value={form.title} maxLength={TITLE_MAX} onChange={(e) => set({ title: e.target.value })}
            placeholder="Ex. : Frais du relevé de notes" />
        </div>

        {form.category === 'frais' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="ann-amount" className={label}>Montant (FCFA, facultatif)</label>
              <input id="ann-amount" className={input} inputMode="numeric" value={form.amount} onChange={(e) => set({ amount: e.target.value })} placeholder="1500" />
            </div>
            <div>
              <label htmlFor="ann-deadline" className={label}>À régler avant (facultatif)</label>
              <input id="ann-deadline" type="date" className={input} value={form.deadline} onChange={(e) => set({ deadline: e.target.value })} />
            </div>
          </div>
        )}

        <div>
          <label htmlFor="ann-body" className={label}>Texte</label>
          <textarea id="ann-body" className={`${input} min-h-[110px]`} value={form.body} maxLength={BODY_MAX} onChange={(e) => set({ body: e.target.value })}
            placeholder="Expliquez clairement : quoi, combien, où payer, jusqu'à quand…" />
          <p className="text-xs text-gray-500 mt-1 text-right">{form.body.length} / {BODY_MAX}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
          <div>
            <label htmlFor="ann-class" className={label}>Destinataires</label>
            <select id="ann-class" className={input} value={form.classId} onChange={(e) => set({ classId: e.target.value })}>
              <option value="">Tout l'établissement</option>
              {classes.map((c) => <option key={c.id} value={c.id}>Classe {c.name}</option>)}
            </select>
          </div>
          {!editingId && (
            <label className="flex items-center gap-2 text-sm text-gray-800">
              <input type="checkbox" checked={form.notify} onChange={(e) => set({ notify: e.target.checked })} className="w-4 h-4" />
              Prévenir les parents (avis dans leur cloche)
            </label>
          )}
        </div>

        {problem && <p role="alert" className="text-sm text-red-700">{problem}</p>}

        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60">
            <Send className="w-4 h-4" /> {saving ? 'Enregistrement…' : editingId ? 'Enregistrer' : 'Publier'}
          </button>
          {editingId && (
            <button type="button" onClick={reset} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-gray-100 text-gray-800">
              <X className="w-4 h-4" /> Annuler
            </button>
          )}
        </div>
      </form>

      {error && <p role="alert" className="text-sm text-red-700">Lecture impossible : {error}</p>}
      {loading ? (
        <p className="text-sm text-gray-600">Chargement…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-600 bg-white rounded-2xl border border-gray-100 p-6 text-center">Aucune info publiée pour le moment.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <AnnouncementCard
              key={item.id} item={item} className={className(item.class_id)}
              actions={canEdit(currentUser, item) && (
                <>
                  <button type="button" onClick={() => startEdit(item)} aria-label={`Modifier : ${item.title}`}
                    className="p-1.5 rounded-lg text-blue-700 hover:bg-blue-50"><Pencil className="w-4 h-4" /></button>
                  <button type="button" onClick={() => askDelete(item)} aria-label={`Supprimer : ${item.title}`}
                    className="p-1.5 rounded-lg text-red-700 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                </>
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
