// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import LegalPage from './LegalPage';
import { parseHash, isPublicView, resolveView } from '../utils/route';

afterEach(cleanup);

describe('LegalPage', () => {
  it('politique de confidentialité : cite la loi, les droits et signale les champs à compléter', () => {
    render(<LegalPage kind="confidentialite" />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Politique de confidentialité');
    expect(document.body.textContent).toMatch(/2019-014/);
    expect(document.body.textContent).toMatch(/rectification/);
    expect(document.body.textContent).toMatch(/\[à renseigner\]/); // aucune coordonnée inventée
    expect(document.body.textContent).toMatch(/à faire relire et valider/);
  });

  it("confidentialité : déclare les actualités, les avis aux parents et le service d'e-mail qui les transmet", () => {
    render(<LegalPage kind="confidentialite" />);
    const text = document.body.textContent;
    expect(text).toMatch(/Actualités de l'établissement/);
    expect(text).toMatch(/Brevo/);
    expect(text).toMatch(/ni note ni moyenne/);
  });

  it("conditions : les infos publiées ne sont pas une facture et les avis ne sont pas garantis", () => {
    render(<LegalPage kind="conditions" />);
    const text = document.body.textContent;
    expect(text).toMatch(/ni une facture ni un reçu/);
    expect(text).toMatch(/réception n'est pas garantie/);
  });

  it("conditions d'utilisation : renvoie vers la politique de confidentialité", () => {
    render(<LegalPage kind="conditions" />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe("Conditions d'utilisation");
    expect(screen.getByRole('link', { name: /confidentialité/i }).getAttribute('href')).toBe('#/confidentialite');
  });

  it('une valeur inconnue retombe sur la confidentialité (jamais une page vide)', () => {
    render(<LegalPage kind="n-importe-quoi" />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Politique de confidentialité');
  });
});

describe('adresses publiques', () => {
  it('les pages légales sont publiques, pas les écrans de l\'application', () => {
    expect(isPublicView(parseHash('#/confidentialite'))).toBe(true);
    expect(isPublicView(parseHash('#/conditions'))).toBe(true);
    expect(isPublicView(parseHash('#/dashboard'))).toBe(false);
    expect(isPublicView(null)).toBe(false);
  });

  it('une page publique ne donne pas accès à un écran absent du menu', () => {
    expect(resolveView('confidentialite', ['dashboard'], 'dashboard')).toBe('dashboard');
  });
});
