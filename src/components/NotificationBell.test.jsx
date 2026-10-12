// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import NotificationBell from './NotificationBell';

afterEach(cleanup);

const make = (items, extra = {}) => ({ items, unread: items.filter((i) => !i.read_at).length, markRead: vi.fn(), markAllRead: vi.fn(), ...extra });
const item = (id, over = {}) => ({ id, title: 'Notes du 1er trimestre disponibles', body: `Les notes du 1er trimestre de Enfant${id} sont disponibles.`, link_view: 'parents', created_at: new Date().toISOString(), read_at: null, ...over });

describe('NotificationBell', () => {
  it('affiche le nombre de non lues dans le nom accessible du bouton', () => {
    render(<NotificationBell notifications={make([item(1), item(2), item(3, { read_at: 'x' })])} allowedViews={['parents']} />);
    expect(screen.getByRole('button', { name: 'Notifications, 2 non lues' })).toBeTruthy();
  });

  it('sans notification non lue : bouton simple, liste vide explicite', () => {
    render(<NotificationBell notifications={make([])} />);
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(screen.getByText('Aucune notification pour le moment.')).toBeTruthy();
  });

  it("cliquer une notification la marque lue et ouvre l'écran, puis referme la liste", () => {
    const notifications = make([item(1)]);
    const onNavigate = vi.fn();
    render(<NotificationBell notifications={notifications} allowedViews={['parents']} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /Notifications, 1 non lue/ }));
    fireEvent.click(screen.getByText(/de Enfant1 sont disponibles/));
    expect(notifications.markRead).toHaveBeenCalledWith(1);
    expect(onNavigate).toHaveBeenCalledWith('parents');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it("n'ouvre pas un écran interdit au compte, mais marque quand même la notification comme lue", () => {
    const notifications = make([item(1, { link_view: 'audit' })]);
    const onNavigate = vi.fn();
    render(<NotificationBell notifications={notifications} allowedViews={['parents']} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /Notifications/ }));
    fireEvent.click(screen.getByText(/de Enfant1/));
    expect(notifications.markRead).toHaveBeenCalledWith(1);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('« Tout marquer comme lu » et Échap', () => {
    const notifications = make([item(1), item(2)]);
    render(<NotificationBell notifications={notifications} allowedViews={['parents']} />);
    fireEvent.click(screen.getByRole('button', { name: /Notifications/ }));
    fireEvent.click(screen.getByRole('button', { name: /Tout marquer comme lu/ }));
    expect(notifications.markAllRead).toHaveBeenCalled();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
