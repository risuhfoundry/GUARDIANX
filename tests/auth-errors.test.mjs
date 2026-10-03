import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SupabaseNotConfiguredError } from '../src/features/auth/authService.js';

describe('auth error surface', () => {
  it('exposes SupabaseNotConfiguredError', () => {
    const error = new SupabaseNotConfiguredError();
    assert.strictEqual(error.name, 'SupabaseNotConfiguredError');
    assert.ok(error.message.includes('Supabase is not configured'));
  });
});
