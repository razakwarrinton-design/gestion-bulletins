import { describe, it, expect } from 'vitest';
import { readFunctionError } from './functionError';

const httpError = (status, body, message = 'Edge Function returned a non-2xx status code') => ({
  name: 'FunctionsHttpError',
  message,
  context: { status, json: async () => body },
});

describe('readFunctionError', () => {
  it('rend le message `error` du corps de la réponse', async () => {
    expect(await readFunctionError(httpError(403, { error: 'Action non autorisée pour votre rôle' }), 'x', 'send-sms'))
      .toBe('Action non autorisée pour votre rôle');
  });

  it("dit que la fonction n'est pas déployée quand la plateforme répond 404", async () => {
    const message = await readFunctionError(
      httpError(404, { code: 'NOT_FOUND', message: 'Requested function was not found' }), 'x', 'notify-parents');
    expect(message).toContain('« notify-parents »');
    expect(message).toMatch(/pas déployée/);
  });

  it("dit que la fonction est injoignable quand la requête n'aboutit pas (fonction absente ou réseau)", async () => {
    const message = await readFunctionError(
      { name: 'FunctionsFetchError', message: 'Failed to send a request to the Edge Function' }, 'x', 'generate-appreciation');
    expect(message).toContain('« generate-appreciation »');
    expect(message).toMatch(/injoignable/);
  });

  it('retombe sur le message générique, puis sur le texte par défaut', async () => {
    expect(await readFunctionError(httpError(500, null), 'défaut')).toMatch(/non-2xx/);
    expect(await readFunctionError({}, 'défaut')).toBe('défaut');
  });

  it('ne plante pas quand le corps de la réponse est illisible', async () => {
    const error = { message: 'boom', context: { status: 502, json: async () => { throw new Error('pas du JSON'); } } };
    expect(await readFunctionError(error, 'défaut')).toBe('boom');
  });
});
