import { describe, it, expect } from 'vitest';
import { hasInternationalPrefix } from './phone';

describe('hasInternationalPrefix', () => {
  it.each([
    '+22890123456',
    '+228 90 12 34 56',
    '  +229 96 12 34 56',
    '0022890123456',
    '+221 77 123 45 67',
  ])('accepte %s', (value) => expect(hasInternationalPrefix(value)).toBe(true));

  it.each([
    '90123456',
    '090123456',
    '+228',
    '+2289',
    'abc',
    '',
    null,
    undefined,
  ])('refuse %s', (value) => expect(hasInternationalPrefix(value)).toBe(false));
});
