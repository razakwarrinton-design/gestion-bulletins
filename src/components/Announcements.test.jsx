// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';

const state = vi.hoisted(() => ({ api: null }));
vi.mock('../hooks/useAnnouncements', () => ({ useAnnouncements: () => state.api }));

import AnnouncementsManager from './AnnouncementsManager';
import AnnouncementsParent, { AnnouncementsBanner } from './AnnouncementsParent';

const item = (over = {}) => ({
  id: 1, title: 'Frais du relevé de notes', body: 'Ligne 1\nLigne 2 <b>gras</b>', category: 'frais', amount_fcfa: 1500, deadline: null,
  class_id: null, author_id: 'u1', author_name: 'Awa Kossi', author_role: 'admin',
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...over,
});
const api = (over = {}) => ({
  items: [], loading: false, error: '', installed: true,
  publish: vi.fn().mockResolvedValue({ id: 9, notified: 3 }), update: vi.fn().mockResolvedValue(), remove: vi.fn().mockResolvedValue(), ...over,
});

beforeEach(() => { state.api = api(); });
afterEach(cleanup);

describe('AnnouncementsManager (personnel)', () => {
  const classes = [{ id: 1, name: '6ème A' }, { id: 2, name: '5ème B' }];
  const admin = { id: 'u1', role: 'admin' };
  const renderManager = (user = admin, extra = {}) => render(
    <AnnouncementsManager currentUser={user} classes={classes} openConfirm={extra.openConfirm ?? vi.fn()} showNotification={extra.showNotification ?? vi.fn()} />);

  it('publie une info de frais avec montant, destinataires et avis aux parents', async () => {
    const showNotification = vi.fn();
    renderManager(admin, { showNotification });
    fireEvent.change(screen.getByLabelText('Titre'), { target: { value: 'Relevé de notes' } });
    fireEvent.change(screen.getByLabelText(/Montant/), { target: { value: '1500' } });
    fireEvent.change(screen.getByLabelText('Texte'), { target: { value: 'À payer au secrétariat.' } });
    fireEvent.change(screen.getByLabelText('Destinataires'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: /Publier/ }));
    await waitFor(() => expect(state.api.publish).toHaveBeenCalled());
    expect(state.api.publish).toHaveBeenCalledWith(
      { title: 'Relevé de notes', body: 'À payer au secrétariat.', category: 'frais', amount_fcfa: 1500, deadline: null, class_id: '1' },
      { notify: true });
    await waitFor(() => expect(showNotification).toHaveBeenCalledWith('Info publiée · 3 parents prévenus'));
  });

  it('refuse un formulaire incomplet sans rien envoyer', () => {
    renderManager();
    fireEvent.click(screen.getByRole('button', { name: /Publier/ }));
    expect(screen.getByRole('alert').textContent).toMatch(/titre est obligatoire/);
    expect(state.api.publish).not.toHaveBeenCalled();
  });

  it("le montant disparaît quand le type n'est plus « Frais »", () => {
    renderManager();
    expect(screen.getByLabelText(/Montant/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Règlement'));
    expect(screen.queryByLabelText(/Montant/)).toBeNull();
  });

  it("affiche l'erreur de la base au lieu de l'avaler", async () => {
    state.api = api({ publish: vi.fn().mockRejectedValue(new Error('new row violates row-level security policy')) });
    renderManager();
    fireEvent.change(screen.getByLabelText('Titre'), { target: { value: 'T' } });
    fireEvent.change(screen.getByLabelText('Texte'), { target: { value: 'B' } });
    fireEvent.click(screen.getByRole('button', { name: /Publier/ }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/row-level security/);
  });

  it.each(["professeur", "secretaire"])("%s : boutons Modifier/Supprimer seulement sur ses propres infos", (role) => {
    state.api = api({ items: [item({ id: 1, author_id: 'p1', title: 'Mienne' }), item({ id: 2, author_id: 'p2', title: 'Celle du collègue' })] });
    renderManager({ id: 'p1', role });
    expect(screen.getByRole('button', { name: 'Modifier : Mienne' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Modifier : Celle du collègue' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Supprimer : Celle du collègue' })).toBeNull();
  });

  it('modifier précharge le formulaire ; supprimer demande confirmation', async () => {
    state.api = api({ items: [item()] });
    const openConfirm = vi.fn();
    renderManager(admin, { openConfirm });
    fireEvent.click(screen.getByRole('button', { name: /Modifier : Frais du relevé/ }));
    expect(screen.getByLabelText('Titre').value).toBe('Frais du relevé de notes');
    expect(screen.getByLabelText(/Montant/).value).toBe('1500');
    fireEvent.change(screen.getByLabelText(/Montant/), { target: { value: '2000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(state.api.update).toHaveBeenCalledWith(1, expect.objectContaining({ amount_fcfa: 2000 })));

    fireEvent.click(screen.getByRole('button', { name: /Supprimer : Frais du relevé/ }));
    expect(openConfirm).toHaveBeenCalledTimes(1);
    await openConfirm.mock.calls[0][2]();
    expect(state.api.remove).toHaveBeenCalledWith(1);
  });

  it("explique quoi exécuter quand le script SQL n'est pas installé", () => {
    state.api = api({ installed: false });
    renderManager();
    expect(screen.getByRole('alert').textContent).toMatch(/sql\/announcements\.sql/);
    expect(screen.queryByLabelText('Titre')).toBeNull();
  });
});

describe("espace parent : infos de l'établissement", () => {
  it("affiche le montant, l'auteur et la classe ; le texte reste du texte (pas de HTML)", () => {
    state.api = api({ items: [item({ class_id: 1 })] });
    const { container } = render(<AnnouncementsParent announcements={state.api} classNames={{ 1: '6ème A' }} />);
    expect(screen.getByText('Frais du relevé de notes')).toBeTruthy();
    expect(container.textContent).toContain(`1${String.fromCharCode(0x202f)}500 FCFA`);
    expect(screen.getByText('Classe 6ème A')).toBeTruthy();
    expect(screen.getByText(/Awa Kossi/)).toBeTruthy();
    expect(screen.getByText('Nouveau')).toBeTruthy();
    expect(container.querySelector('b')).toBeNull(); // « <b>gras</b> » n'est pas interprété
    expect(container.textContent).toContain('<b>gras</b>');
    expect(container.textContent).toMatch(/information/);
  });

  it('états vide, chargement, erreur, non installé', () => {
    const view = (over) => render(<AnnouncementsParent announcements={api(over)} />);
    view({}); expect(screen.getByText(/Aucune info publiée/)).toBeTruthy(); cleanup();
    view({ loading: true }); expect(screen.getByText('Chargement…')).toBeTruthy(); cleanup();
    view({ error: 'boom' }); expect(screen.getByRole('alert').textContent).toMatch(/boom/); cleanup();
    view({ installed: false }); expect(screen.getByText(/pas encore disponibles/)).toBeTruthy();
  });

  it("le bandeau compte les infos récentes et ouvre l'onglet ; absent s'il n'y en a pas", () => {
    const onOpen = vi.fn();
    const old = item({ id: 2, created_at: '2025-01-01T00:00:00Z' });
    state.api = api({ items: [item({ id: 1 }), old] });
    const { container, rerender } = render(<AnnouncementsBanner announcements={state.api} onOpen={onOpen} />);
    const banner = screen.getByRole('button');
    expect(within(banner).getByText(/1 nouvelle actualité de l'école/)).toBeTruthy();
    fireEvent.click(banner);
    expect(onOpen).toHaveBeenCalled();
    rerender(<AnnouncementsBanner announcements={api({ items: [old] })} onOpen={onOpen} />);
    expect(container.textContent).toBe('');
  });
});
