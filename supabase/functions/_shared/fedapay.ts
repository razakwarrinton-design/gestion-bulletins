// supabase/functions/_shared/fedapay.ts
//
// Client FedaPay minimal et fonctions pures (testables avec Vitest, sans dépendance Deno).
// FedaPay agrège Moov Money (Flooz) et T-Money (Togo), MTN / Moov / Celtiis (Bénin),
// Orange / MTN / Moov / Wave (Côte d'Ivoire, Sénégal)…
//
// Doc : https://docs.fedapay.com
//   - Création d'une collecte : POST {base}/transactions
//   - Jeton + lien de paiement : POST {base}/transactions/{id}/token
//   - Lecture : GET {base}/transactions/{id}
//   - Webhooks signés (en-tête X-FEDAPAY-SIGNATURE), événements transaction.approved…

export type FedapayEnv = "sandbox" | "live";

export const FEDAPAY_BASE_URLS: Record<FedapayEnv, string> = {
  sandbox: "https://sandbox-api.fedapay.com/v1",
  live: "https://api.fedapay.com/v1",
};

/** Statuts applicatifs de la table payments (contrainte CHECK en base). */
export type PaymentStatus = "pending" | "processing" | "completed" | "failed";

/**
 * Traduit un statut de transaction FedaPay vers un statut de la table payments.
 * Tout statut inconnu reste "pending" : on ne marque JAMAIS un paiement comme
 * réussi sans statut explicitement approuvé.
 */
export function mapFedapayStatus(status: unknown): PaymentStatus {
  switch (String(status ?? "").toLowerCase()) {
    case "approved":
    case "transferred":
      return "completed";
    case "declined":
    case "canceled":
    case "cancelled":
    case "refunded":
    case "expired":
      return "failed";
    default:
      return "pending";
  }
}

/**
 * Les réponses FedaPay v1 enveloppent l'objet sous une clé du type "v1/transaction".
 * On accepte aussi l'objet nu, et un tableau d'un élément.
 */
// deno-lint-ignore no-explicit-any
export function unwrapEntity(body: any, name: string): any {
  if (!body || typeof body !== "object") return null;
  // Une enveloppe est un objet (ou un tableau) ; une chaîne du même nom, comme le
  // champ "token" de la réponse de génération du lien, n'en est pas une.
  const isEnvelope = (value: unknown) => value !== null && typeof value === "object";
  const wrapped = [body[`v1/${name}`], body[name]].find(isEnvelope);
  let entity = wrapped ?? body;
  if (Array.isArray(entity)) entity = entity[0];
  return entity ?? null;
}

const COUNTRY_BY_DIAL_CODE: Array<[string, string]> = [
  ["228", "tg"], // Togo
  ["229", "bj"], // Bénin
  ["225", "ci"], // Côte d'Ivoire
  ["221", "sn"], // Sénégal
];

/**
 * Découpe un numéro international (+22890123456, 0022890123456, 228 90 12 34 56)
 * en { number, country } comme attendu par FedaPay (numéro sans indicatif).
 * Retourne null si le numéro n'est pas reconnu.
 */
export function splitPhoneNumber(
  raw: string,
): { number: string; country: string } | null {
  if (!raw) return null;
  let digits = String(raw).replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  else return null; // sans indicatif pays on ne devine pas

  for (const [dial, country] of COUNTRY_BY_DIAL_CODE) {
    if (digits.startsWith(dial)) {
      const number = digits.slice(dial.length);
      if (number.length >= 8 && number.length <= 10) return { number, country };
    }
  }
  return null;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
}

/** Comparaison à temps constant de deux chaînes hexadécimales. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Génère l'en-tête de signature (utile pour les tests et les simulations en sandbox). */
export async function signWebhookPayload(
  payload: string,
  secret: string,
  timestamp: number,
): Promise<string> {
  const signature = await hmacSha256Hex(secret, `${timestamp}.${payload}`);
  return `t=${timestamp},s=${signature}`;
}

/**
 * Vérifie l'en-tête X-FEDAPAY-SIGNATURE (format "t=<timestamp>,s=<hmac-sha256 hex>",
 * signature calculée sur "<timestamp>.<corps brut>" avec le secret du webhook).
 *
 * ⚠️ À valider avec un vrai webhook en sandbox avant la mise en production : le
 * format ci-dessus suit les bibliothèques officielles FedaPay. De toute façon, le
 * webhook relit la transaction directement chez FedaPay avant de modifier la base.
 */
export async function verifyWebhookSignature(
  payload: string,
  header: string | null,
  secret: string,
  options: { toleranceSeconds?: number; nowSeconds?: number } = {},
): Promise<boolean> {
  if (!header || !secret) return false;
  const { toleranceSeconds = 300, nowSeconds = Math.floor(Date.now() / 1000) } =
    options;

  const parts: Record<string, string> = {};
  for (const piece of header.split(",")) {
    const idx = piece.indexOf("=");
    if (idx > 0) parts[piece.slice(0, idx).trim()] = piece.slice(idx + 1).trim();
  }
  const timestamp = Number(parts.t);
  const provided = parts.s;
  if (!Number.isFinite(timestamp) || !provided) return false;
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) return false;

  const expected = await hmacSha256Hex(secret, `${timestamp}.${payload}`);
  return timingSafeEqual(expected, provided.toLowerCase());
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface FedapayClientOptions {
  secretKey: string;
  env?: FedapayEnv;
  fetchImpl?: FetchLike;
}

export interface CreateCollectInput {
  description: string;
  amount: number; // entier, en FCFA (XOF)
  callbackUrl: string;
  merchantReference: string;
  customer: {
    firstname?: string;
    lastname?: string;
    email?: string;
    phone?: { number: string; country: string } | null;
  };
  metadata?: Record<string, unknown>;
}

export function createFedapayClient(options: FedapayClientOptions) {
  const base = FEDAPAY_BASE_URLS[options.env ?? "sandbox"];
  const doFetch: FetchLike = options.fetchImpl ?? fetch;

  // deno-lint-ignore no-explicit-any
  async function call(path: string, init: RequestInit = {}): Promise<any> {
    const response = await doFetch(`${base}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${options.secretKey}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
    const text = await response.text();
    // deno-lint-ignore no-explicit-any
    let body: any = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { raw: text };
    }
    if (!response.ok) {
      const message = body?.message ?? body?.error ?? `HTTP ${response.status}`;
      throw new Error(`FedaPay : ${message}`);
    }
    return body;
  }

  return {
    /** Crée la collecte et renvoie son identifiant et l'URL de paiement hébergée. */
    async createCollect(input: CreateCollectInput) {
      if (!Number.isInteger(input.amount) || input.amount <= 0) {
        throw new Error("Le montant doit être un entier strictement positif (FCFA)");
      }

      const customer: Record<string, unknown> = {};
      if (input.customer.firstname) customer.firstname = input.customer.firstname;
      if (input.customer.lastname) customer.lastname = input.customer.lastname;
      if (input.customer.email) customer.email = input.customer.email;
      if (input.customer.phone) {
        customer.phone_number = {
          number: input.customer.phone.number,
          country: input.customer.phone.country,
        };
      }

      const created = unwrapEntity(
        await call("/transactions", {
          method: "POST",
          body: JSON.stringify({
            description: input.description,
            amount: input.amount,
            currency: { iso: "XOF" },
            callback_url: input.callbackUrl,
            merchant_reference: input.merchantReference,
            custom_metadata: input.metadata ?? {},
            customer,
          }),
        }),
        "transaction",
      );
      if (!created?.id) throw new Error("FedaPay : réponse sans identifiant de transaction");

      const tokenBody = unwrapEntity(
        await call(`/transactions/${created.id}/token`, { method: "POST" }),
        "token",
      );
      const url = tokenBody?.url;
      if (!url) throw new Error("FedaPay : lien de paiement absent de la réponse");

      return {
        externalId: String(created.id),
        reference: created.reference as string | undefined,
        paymentUrl: url as string,
      };
    },

    /** Relit une transaction : c'est la source de vérité du statut. */
    async getTransaction(id: string | number) {
      const tx = unwrapEntity(await call(`/transactions/${id}`), "transaction");
      if (!tx) throw new Error("FedaPay : transaction introuvable");
      return {
        externalId: String(tx.id),
        status: String(tx.status ?? ""),
        amount: Number(tx.amount),
        merchantReference: (tx.merchant_reference ?? null) as string | null,
        approvedAt: (tx.approved_at ?? null) as string | null,
        lastErrorCode: (tx.last_error_code ?? null) as string | null,
      };
    },
  };
}
