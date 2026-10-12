// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Sidebar from './Sidebar';
import { NAV_ITEMS } from '../config/navigation';

afterEach(() => { cleanup(); try { localStorage.clear(); } catch { /* ignore */ } });

const itemsFor = (role) => NAV_ITEMS.filter((item) => item.roles.includes(role));
const renderSidebar = (role, currentView = 'dashboard') => render(
  <Sidebar
    visibleNavItems={itemsFor(role)} currentView={currentView} mobileMenuOpen={false}
    setMobileMenuOpen={() => {}} onNavigate={vi.fn()} currentUser={{ firstName: 'Awa', lastName: 'Kossi', role }}
  />,
);
const section = (name) => screen.getByRole('button', { name: new RegExp(`^${name}$`, 'i') });

describe('Sidebar : rubriques repliables', () => {
  it('l\'administrateur (plus de 12 entrées) voit Principal et Notes ouvertes, Avancé et Gestion repliées', () => {
    renderSidebar('admin');
    expect(itemsFor('admin').length).toBeGreaterThan(12);
    expect(section('Principal').getAttribute('aria-expanded')).toBe('true');
    expect(section('Notes & Bulletins').getAttribute('aria-expanded')).toBe('true');
    expect(section('Avancé').getAttribute('aria-expanded')).toBe('false');
    expect(section('Gestion').getAttribute('aria-expanded')).toBe('false');
  });

  it('un menu court reste entièrement déplié', () => {
    renderSidebar('parent');
    expect(itemsFor('parent').length).toBeLessThanOrEqual(12);
    for (const button of screen.getAllByRole('button').filter((b) => b.hasAttribute('aria-expanded'))) {
      expect(button.getAttribute('aria-expanded')).toBe('true');
    }
  });

  it('la rubrique de l\'écran affiché est toujours ouverte, même repliée par l\'utilisateur', () => {
    localStorage.setItem('edupulse.navSections', JSON.stringify({ avance: false }));
    renderSidebar('admin', 'analytics'); // « Analyse avancée » est dans la rubrique Avancé
    expect(section('Avancé').getAttribute('aria-expanded')).toBe('true');
  });

  it('ouvrir ou replier une rubrique est mémorisé', () => {
    renderSidebar('admin');
    fireEvent.click(section('Gestion'));
    expect(section('Gestion').getAttribute('aria-expanded')).toBe('true');
    expect(JSON.parse(localStorage.getItem('edupulse.navSections'))).toMatchObject({ gestion: true });
    cleanup();
    renderSidebar('admin');
    expect(section('Gestion').getAttribute('aria-expanded')).toBe('true'); // relu au rechargement
  });

  it('une rubrique repliée cache ses entrées (hors du parcours au clavier) sans les retirer', () => {
    renderSidebar('admin');
    const hidden = document.getElementById('nav-gestion');
    expect(hidden.hidden).toBe(true);
    fireEvent.click(section('Gestion'));
    expect(document.getElementById('nav-gestion').hidden).toBe(false);
  });

  it('fonctionne si le stockage du navigateur est indisponible', () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqué'); });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqué'); });
    renderSidebar('admin');
    fireEvent.click(section('Gestion'));
    expect(section('Gestion').getAttribute('aria-expanded')).toBe('true');
    get.mockRestore();
    set.mockRestore();
  });
});
