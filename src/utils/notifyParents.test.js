import { describe, it, expect, vi } from 'vitest';
import { notifyParents, describeOutcome, emailAnnouncement, emailSummary } from './notifyParents';

const fakeSupabase = ({ rpc, invoke }) => ({
  rpc: vi.fn().mockResolvedValue(rpc),
  functions: { invoke: vi.fn().mockResolvedValue(invoke) },
});
const rpcOk = { data: { notified: 3, already: 0, students: 4, studentsWithoutParent: 1 }, error: null };
const httpError = (status, body) => ({ data: null, error: { name: 'FunctionsHttpError', context: { status, json: async () => body } } });

describe('notifyParents', () => {
  it("crée les notifications puis envoie les e-mails, sans laisser l'appelant choisir texte ni destinataires", async () => {
    const supabase = fakeSupabase({ rpc: rpcOk, invoke: { data: { sent: 3, failed: 0, noEmail: 0 }, error: null } });
    const result = await notifyParents(supabase, { classId: 7, trimester: '2' });
    expect(supabase.rpc).toHaveBeenCalledWith('notify_class_parents', { p_class_id: 7, p_trimester: '2' });
    expect(supabase.functions.invoke).toHaveBeenCalledWith('notify-parents', { body: { classId: 7, trimester: '2' } });
    expect(result.inApp).toEqual({ notified: 3, already: 0, students: 4, studentsWithoutParent: 1 });
    expect(result.email).toMatchObject({ status: 'sent', sent: 3 });
  });

  it("e-mail non configuré : les notifications de l'application sont quand même envoyées", async () => {
    const supabase = fakeSupabase({ rpc: rpcOk, invoke: httpError(503, { error: "L'envoi d'e-mails n'est pas configuré (BREVO_API_KEY, MAIL_FROM_EMAIL)" }) });
    const result = await notifyParents(supabase, { classId: 1, trimester: '1' });
    expect(result.inApp.notified).toBe(3);
    expect(result.email.status).toBe('unavailable');
  });

  it('fonction e-mail non déployée : même résultat', async () => {
    const supabase = fakeSupabase({ rpc: rpcOk, invoke: httpError(404, {}) });
    expect((await notifyParents(supabase, { classId: 1, trimester: '1' })).email.status).toBe('unavailable');
  });

  it('refus du fournisseur : échec affiché avec son motif', async () => {
    const supabase = fakeSupabase({ rpc: rpcOk, invoke: { data: { sent: 0, failed: 3, noEmail: 0, error: 'Sender not valid' }, error: null } });
    const { email } = await notifyParents(supabase, { classId: 1, trimester: '1' });
    expect(email).toMatchObject({ status: 'failed', failed: 3, error: 'Sender not valid' });
  });

  it('rien à envoyer (déjà envoyés) : statut « none »', async () => {
    const supabase = fakeSupabase({ rpc: rpcOk, invoke: { data: { sent: 0, failed: 0, noEmail: 0 }, error: null } });
    expect((await notifyParents(supabase, { classId: 1, trimester: '1' })).email.status).toBe('none');
  });

  it('script SQL non exécuté : message explicite, aucun e-mail tenté', async () => {
    const supabase = fakeSupabase({ rpc: { data: null, error: { code: 'PGRST202', message: 'Could not find the function public.notify_class_parents' } }, invoke: { data: {}, error: null } });
    await expect(notifyParents(supabase, { classId: 1, trimester: '1' })).rejects.toThrow(/sql\/notifications\.sql/);
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });

  it('rôle non autorisé : le message de la base est transmis', async () => {
    const supabase = fakeSupabase({ rpc: { data: null, error: { code: 'P0001', message: 'Réservé aux administrateurs et aux professeurs' } }, invoke: { data: {}, error: null } });
    await expect(notifyParents(supabase, { classId: 1, trimester: '1' })).rejects.toThrow('Réservé aux administrateurs et aux professeurs');
  });
});

describe('emailAnnouncement', () => {
  it("n'envoie que l'identifiant de l'actualité (ni texte ni destinataires)", async () => {
    const supabase = fakeSupabase({ invoke: { data: { sent: 12, failed: 0, noEmail: 1 }, error: null } });
    const email = await emailAnnouncement(supabase, 9);
    expect(supabase.functions.invoke).toHaveBeenCalledWith('notify-parents', { body: { announcementId: 9 } });
    expect(email).toMatchObject({ status: 'sent', sent: 12, noEmail: 1 });
  });

  it("ne lève jamais : service non configuré ou erreur réseau deviennent un statut", async () => {
    const unavailable = fakeSupabase({ invoke: httpError(503, { error: "L'envoi d'e-mails n'est pas configuré (BREVO_API_KEY, MAIL_FROM_EMAIL)" }) });
    expect((await emailAnnouncement(unavailable, 9)).status).toBe('unavailable');
    const down = { functions: { invoke: vi.fn().mockRejectedValue(new Error('network down')) } };
    expect(await emailAnnouncement(down, 9)).toMatchObject({ status: 'failed', error: 'network down' });
  });
});

describe('emailSummary', () => {
  it('résume les envois et les échecs', () => {
    expect(emailSummary({ status: 'sent', sent: 1, failed: 0 })).toBe('1 e-mail envoyé');
    expect(emailSummary({ status: 'sent', sent: 5, failed: 2 })).toBe('5 e-mails envoyés, 2 échecs');
    expect(emailSummary({ status: 'failed', error: 'Sender not valid' })).toBe('e-mails non envoyés (Sender not valid)');
  });
  it("se tait quand l'e-mail n'est pas configuré ou qu'il n'y avait rien à envoyer", () => {
    expect(emailSummary({ status: 'unavailable' })).toBeNull();
    expect(emailSummary({ status: 'none' })).toBeNull();
    expect(emailSummary(null)).toBeNull();
  });
});

describe('describeOutcome', () => {
  const inApp = { notified: 3, already: 0, students: 4, studentsWithoutParent: 1 };
  it('résume les trois résultats distincts', () => {
    const lines = describeOutcome({ inApp, email: { status: 'unavailable', sent: 0, failed: 0, noEmail: 0 } });
    expect(lines.map((l) => l.text)).toEqual([
      "3 notifications envoyées dans l'application.",
      "E-mails non envoyés : le service d'e-mail n'est pas configuré pour cet établissement.",
      '1 élève sans compte parent : il ne peut pas être prévenu (Gestion parents).',
    ]);
  });
  it('dit quand les parents ont déjà été prévenus', () => {
    const lines = describeOutcome({ inApp: { ...inApp, notified: 0, already: 3, studentsWithoutParent: 0 }, email: { status: 'none', sent: 0, failed: 0, noEmail: 0 } });
    expect(lines[0].text).toMatch(/déjà été prévenus/);
  });
  it("dit quand aucun parent n'a de compte lié", () => {
    const lines = describeOutcome({ inApp: { notified: 0, already: 0, students: 3, studentsWithoutParent: 3 }, email: { status: 'none', sent: 0, failed: 0, noEmail: 0 } });
    expect(lines[0]).toMatchObject({ tone: 'warn' });
  });
  it('compte les e-mails envoyés, les échecs et les parents sans adresse', () => {
    const lines = describeOutcome({ inApp, email: { status: 'sent', sent: 1, failed: 2, noEmail: 1 } });
    expect(lines[1].text).toBe('1 e-mail envoyé. 2 échecs.');
    expect(lines.some((l) => l.text === '1 parent sans adresse e-mail.')).toBe(true);
  });
});
