import qrcode from 'qrcode-generator';

// Les noms d'élèves contiennent des accents : encodage UTF-8 obligatoire, sinon le QR code est faux.
qrcode.stringToBytes = (text) => Array.from(new TextEncoder().encode(text));

/**
 * QR code généré localement, sous forme d'URL de données (data:image/gif).
 * Aucune donnée d'élève ne quitte le navigateur (l'ancienne version envoyait nom, classe,
 * rang et moyenne à un service tiers pour fabriquer l'image).
 */
export function qrDataUrl(text, { cellSize = 4, margin = 0 } = {}) {
    const qr = qrcode(0, 'M'); // 0 = taille automatique
    qr.addData(String(text));
    qr.make();
    return qr.createDataURL(cellSize, margin);
}
