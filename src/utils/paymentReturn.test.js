import { describe, it, expect, vi } from 'vitest';
import { consumePaymentReturn } from './paymentReturn';

const fakeLocation = (search, pathname = '/', hash = '') => ({ search, pathname, hash });

describe('consumePaymentReturn', () => {
  it('renvoie l\'identifiant et nettoie l\'URL', () => {
    const history = { replaceState: vi.fn() };
    const id = consumePaymentReturn(fakeLocation('?payment=abc-123'), history);
    expect(id).toBe('abc-123');
    expect(history.replaceState).toHaveBeenCalledWith(null, '', '/');
  });

  it('conserve les autres paramètres et le fragment', () => {
    const history = { replaceState: vi.fn() };
    consumePaymentReturn(fakeLocation('?a=1&payment=x&b=2', '/app', '#top'), history);
    expect(history.replaceState).toHaveBeenCalledWith(null, '', '/app?a=1&b=2#top');
  });

  it('ne fait rien sans paramètre payment', () => {
    const history = { replaceState: vi.fn() };
    expect(consumePaymentReturn(fakeLocation('?a=1'), history)).toBeNull();
    expect(history.replaceState).not.toHaveBeenCalled();
  });

  it('ne plante pas sans environnement navigateur', () => {
    expect(consumePaymentReturn(null, null)).toBeNull();
  });

  it('tolère un historique qui échoue', () => {
    const history = { replaceState: () => { throw new Error('bloqué'); } };
    expect(consumePaymentReturn(fakeLocation('?payment=z'), history)).toBe('z');
  });
});
