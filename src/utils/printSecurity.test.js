// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { prepareBulletinHtml, sanitizeBulletinHtml, isUnsafeUrl, PRINT_CSP } from './printSecurity';
import { qrDataUrl } from './qrCode';

const page = (body, head = '') =>
  `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">${head}<style>body{margin:0}</style></head><body>${body}</body></html>`;

describe('prepareBulletinHtml', () => {
  it('place la CSP en première position dans <head>', () => {
    const out = prepareBulletinHtml(page('<p>Bonjour</p>'));
    expect(out.startsWith('<!DOCTYPE html>')).toBe(true);
    const doc = new DOMParser().parseFromString(out, 'text/html');
    const first = doc.head.firstElementChild;
    expect(first.getAttribute('http-equiv')).toBe('Content-Security-Policy');
    expect(first.getAttribute('content')).toBe(PRINT_CSP);
  });

  it('la CSP interdit script, réseau, formulaire et base', () => {
    expect(PRINT_CSP).toContain("default-src 'none'");
    expect(PRINT_CSP).toContain("script-src 'none'");
    expect(PRINT_CSP).toContain("form-action 'none'");
    expect(PRINT_CSP).toContain("base-uri 'none'");
    expect(PRINT_CSP).not.toContain('https:');
  });

  it('conserve la mise en page : styles, tableaux, texte accentué', () => {
    const out = prepareBulletinHtml(page('<table><tr><td style="color:red">Éléonore N\'Dri</td></tr></table>'));
    expect(out).toContain('<style>body{margin:0}</style>');
    expect(out).toContain('<table>');
    expect(out).toContain('color:red');
    expect(out).toContain("Éléonore N'Dri");
  });

  it('conserve le logo en data URL et le QR code', () => {
    const logo = 'data:image/png;base64,iVBORw0KGgo=';
    const out = prepareBulletinHtml(page(`<img src="${logo}"><img src="${qrDataUrl('test')}">`));
    expect(out).toContain(logo);
    expect(out).toContain('data:image/gif;base64,');
  });
});

describe('sanitizeBulletinHtml : contenus injectés dans un nom d\'élève', () => {
  const clean = (body) => sanitizeBulletinHtml(page(body)).body;

  it('supprime les gestionnaires d\'événements', () => {
    const body = clean('<img src="x" onerror="alert(1)"><div onmouseover="x()">a</div>');
    expect(body.innerHTML).not.toMatch(/onerror|onmouseover/i);
    expect(body.querySelector('div').textContent).toBe('a');
  });

  it('supprime les scripts, iframes, objets et formulaires', () => {
    const body = clean('<script>steal()</script><iframe src="https://evil"></iframe><object data="x"></object><embed src="x"><form action="https://evil"><input name="p"></form>ok');
    ['script', 'iframe', 'object', 'embed', 'form'].forEach((tag) => expect(body.querySelector(tag)).toBeNull());
    expect(body.textContent).toContain('ok');
  });

  it('neutralise les URL javascript: (même masquées)', () => {
    const body = clean('<a href="javascript:steal()">a</a><a href=" JaVa\nScRiPt:x">b</a><a href="vbscript:x">c</a>');
    body.querySelectorAll('a').forEach((a) => expect(a.hasAttribute('href')).toBe(false));
  });

  it('refuse data: hors images (data:text/html)', () => {
    const body = clean('<a href="data:text/html,<script>x()</script>">a</a><img src="data:image/png;base64,AAAA">');
    expect(body.querySelector('a').hasAttribute('href')).toBe(false);
    expect(body.querySelector('img').getAttribute('src')).toBe('data:image/png;base64,AAAA');
  });

  it('supprime meta refresh, base et link', () => {
    const doc = sanitizeBulletinHtml(page('x', '<meta http-equiv="refresh" content="0;url=https://evil"><base href="https://evil/"><link rel="stylesheet" href="https://evil/x.css">'));
    expect(doc.querySelector('meta[http-equiv]')).toBeNull();
    expect(doc.querySelector('base')).toBeNull();
    expect(doc.querySelector('link')).toBeNull();
    expect(doc.querySelector('meta[charset]')).not.toBeNull();
  });

  it('le texte échappé reste du texte', () => {
    const body = clean('<p>&lt;script&gt;x()&lt;/script&gt;</p>');
    expect(body.querySelector('script')).toBeNull();
    expect(body.textContent).toContain('<script>x()</script>');
  });
});

describe('isUnsafeUrl', () => {
  it.each(['javascript:alert(1)', ' JAVASCRIPT:alert(1)', 'java\tscript:alert(1)', 'vbscript:x', 'data:text/html,<b>', 'data:application/javascript,x'])(
    'dangereux : %s',
    (url) => expect(isUnsafeUrl(url)).toBe(true),
  );
  it.each(['https://exemple.org', '/chemin', '#ancre', 'data:image/png;base64,AAA', 'mailto:a@b.c'])(
    'sûr : %s',
    (url) => expect(isUnsafeUrl(url)).toBe(false),
  );
});

describe('qrDataUrl', () => {
  it('produit une image GIF en URL de données, sans réseau', () => {
    expect(qrDataUrl('Koffi Mensah | 6ème A | Rang:1/28').startsWith('data:image/gif;base64,')).toBe(true);
  });

  it('gère les accents et les textes de la taille d\'un bulletin', () => {
    const text = `Éléonore N'Dri | 6ème A | Rang:3/28 | Moy:13.71/20 | Trimestre 2 2024-2025`;
    expect(() => qrDataUrl(text)).not.toThrow();
  });

  it('un texte différent donne un QR code différent', () => {
    expect(qrDataUrl('a')).not.toBe(qrDataUrl('b'));
  });
});
