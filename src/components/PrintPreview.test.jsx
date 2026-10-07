// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

// Ligne renvoyée par la fonction SQL child_class_rank (null = fonction indisponible : repli local)
const server = vi.hoisted(() => ({ row: null }));

vi.mock('../config/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
    }),
    rpc: () => Promise.resolve({ data: server.row ? [server.row] : [], error: null }),
  },
}));

import PrintPreview from './PrintPreview';
import { calculateAverage, getMention } from '../utils/grades';

const classes = [{ id: 'c1', name: '6ème A' }];
const subjects = [{ id: 'math', name: 'Maths', coefficient: 4 }];
const students = [
  { id: 's1', firstName: 'Koffi', lastName: 'Mensah', classId: 'c1' },
  { id: 's2', firstName: 'Ama', lastName: 'Dossou', classId: 'c1' },
];
const grades = [
  { studentId: 's1', subjectId: 'math', trimester: '1', value: 15 },
  { studentId: 's2', subjectId: 'math', trimester: '1', value: 9 },
];

const baseProps = (overrides = {}) => ({
  printStudent: students[0],
  setShowPrintPreview: () => {},
  selectedTrimester: '1',
  calculateAverage: (id, t) => calculateAverage(id, t, grades, subjects),
  getMention,
  grades, subjects, classes, students,
  appColors: {}, schoolLogo: null,
  schoolInfo: { name: 'Collège Test', year: '2024-2025' },
  handlePrint: () => {},
  ...overrides,
});

let opened;
beforeEach(() => {
  server.row = null;
  opened = { html: '', document: { write: (h) => { opened.html += h; }, close() {} }, print: vi.fn(), close: vi.fn() };
  vi.spyOn(window, 'open').mockReturnValue(opened);
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('PrintPreview', () => {
  it('se rend pour un élève (régression : `student` était lu avant sa déclaration)', () => {
    expect(() => render(<PrintPreview {...baseProps()} />)).not.toThrow();
  });

  it('ne rend rien sans élève sélectionné, puis fonctionne quand il apparaît (ordre des hooks)', () => {
    const { container, rerender } = render(<PrintPreview {...baseProps({ printStudent: null })} />);
    expect(container.innerHTML).toBe('');
    expect(() => rerender(<PrintPreview {...baseProps()} />)).not.toThrow();
  });

  it('écoute l\'événement print-bulletin et ouvre le bulletin dans une fenêtre', () => {
    render(<PrintPreview {...baseProps()} />);
    act(() => {
      window.dispatchEvent(new CustomEvent('print-bulletin', { detail: { template: 'model1' } }));
    });
    expect(window.open).toHaveBeenCalled();
    expect(opened.html).toContain('Koffi');
    expect(opened.html).toContain('Collège Test');
  });
});

describe('PrintPreview : rang et statistiques de classe', () => {
  const printAndRead = async () => {
    render(<PrintPreview {...baseProps()} />);
    await act(async () => { await Promise.resolve(); }); // laisse la réponse de la base arriver
    act(() => {
      window.dispatchEvent(new CustomEvent('print-bulletin', { detail: { template: 'model1' } }));
    });
    return new DOMParser().parseFromString(opened.html, 'text/html').body.textContent.replace(/\s+/g, ' ');
  };

  it('utilise le rang et les statistiques fournis par la base (cas d\'un parent qui ne lit que son enfant)', async () => {
    server.row = { rank: 2, total: 28, class_average: '11.50', class_max: '17.00', class_min: '4.00' };
    const text = await printAndRead();
    expect(text).toContain('2 / 28');
    expect(text).toContain('11.50');
  });

  it('retombe sur le calcul local quand la base ne répond pas', async () => {
    const text = await printAndRead();
    expect(text).toContain('1 / 2'); // élève 1 sur 2 élèves de la classe
  });
});

describe('PrintPreview : sécurité du HTML généré', () => {
  const evil = '<img src=x onerror="alert(document.domain)">';

  const printWith = (overrides) => {
    render(<PrintPreview {...baseProps(overrides)} />);
    act(() => {
      window.dispatchEvent(new CustomEvent('print-bulletin', { detail: { template: 'model1' } }));
    });
    return opened.html;
  };

  const parse = (html) => new DOMParser().parseFromString(html, 'text/html');
  const executable = (doc) => ({
    scripts: doc.querySelectorAll('script, iframe, object, embed, form').length,
    handlers: Array.from(doc.querySelectorAll('*')).filter((el) =>
      Array.from(el.attributes).some((a) => a.name.toLowerCase().startsWith('on'))).length,
  });

  it('place une CSP sans script ni réseau en tête de document', () => {
    const doc = parse(printWith({ printStudent: { ...students[0], firstName: evil } }));
    const first = doc.head.firstElementChild;
    expect(first.getAttribute('http-equiv')).toBe('Content-Security-Policy');
    const csp = first.getAttribute('content');
    expect(csp).toContain("script-src 'none'");
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("form-action 'none'");
    expect(csp).toContain("base-uri 'none'");
  });

  it("neutralise le HTML injecté dans un nom d'élève (aucun gestionnaire, aucun script)", () => {
    const doc = parse(printWith({ printStudent: { ...students[0], firstName: evil, lastName: '<script>steal()</script>' } }));
    expect(executable(doc)).toEqual({ scripts: 0, handlers: 0 });
  });

  it("neutralise aussi les champs de l'école et les matières", () => {
    const doc = parse(printWith({
      schoolInfo: { name: '<script>x()</script>', year: '2024-2025' },
      subjects: [{ id: 'math', name: '<b onmouseover=1>Maths</b>', coefficient: 4 }],
    }));
    expect(executable(doc)).toEqual({ scripts: 0, handlers: 0 });
  });

  it("conserve accents et apostrophes des noms (N'Dri, Éléonore)", () => {
    const doc = parse(printWith({ printStudent: { ...students[0], firstName: 'Éléonore', lastName: "N'Dri" } }));
    expect(doc.body.textContent).toContain('Éléonore');
    expect(doc.body.textContent).toContain("N'Dri");
  });

  it('contient un QR code local (image de données) pour le modèle 1', () => {
    const doc = parse(printWith({}));
    const qr = Array.from(doc.querySelectorAll('img')).find((img) => img.getAttribute('alt') === 'QR');
    expect(qr.getAttribute('src').startsWith('data:image/gif;base64,')).toBe(true);
  });

  it('n\'envoie aucune donnée d\'élève à un service tiers (QR code généré localement)', () => {
    const html = printWith({});
    expect(html).not.toContain('api.qrserver.com');
  });
});

describe('PrintPreview : affichage', () => {
  it('affiche le nom de l\'élève sans entités HTML parasites', () => {
    render(<PrintPreview {...baseProps({ printStudent: { ...students[0], firstName: 'Éléonore', lastName: "N'Dri" } })} />);
    // pas d'échappement dans l'interface React (React échappe déjà lui-même)
    expect(screen.queryByText(/&#39;/)).toBeNull();
  });
});
