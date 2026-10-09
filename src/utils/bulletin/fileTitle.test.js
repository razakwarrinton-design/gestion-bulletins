import { describe, it, expect } from 'vitest';
import { fileTitle, withDocumentTitle } from './index';

describe('fileTitle', () => {
  it('assemble un nom de fichier lisible', () => {
    expect(fileTitle('Bulletin', 'Mensah', 'Koffi', 'T1', '2026-2027')).toBe('Bulletin_Mensah_Koffi_T1_2026-2027');
  });

  it('remplace les espaces et retire les caractères interdits dans un nom de fichier', () => {
    expect(fileTitle('Bulletins', '6ème A/B', 'T2')).toBe('Bulletins_6ème_AB_T2');
    expect(fileTitle('Bulletin', 'Da Silva', 'Jean-Luc: "JL"')).toBe('Bulletin_Da_Silva_Jean-Luc_JL');
  });

  it('ignore les parties absentes', () => {
    expect(fileTitle('Bulletin', undefined, null, 'T3', '')).toBe('Bulletin_T3');
  });
});

describe('withDocumentTitle', () => {
  it('remplace le titre et échappe le texte', () => {
    const html = '<html><head><title>Ancien</title></head><body>Ancien</body></html>';
    expect(withDocumentTitle(html, 'A&B <x>')).toBe('<html><head><title>A&amp;B &lt;x&gt;</title></head><body>Ancien</body></html>');
  });

  it('ne casse pas un titre contenant « $& »', () => {
    expect(withDocumentTitle('<title>x</title>', "a$&b")).toBe('<title>a$&amp;b</title>');
  });
});
