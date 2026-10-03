import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readSupabaseConfig } from '../src/lib/supabaseConfig.js';

describe('readSupabaseConfig', () => {
  it('rejects when both values are missing', () => {
    const result = readSupabaseConfig({});
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.code, 'missing');
  });

  it('rejects an invalid URL', () => {
    const result = readSupabaseConfig({ VITE_SUPABASE_URL: 'not-a-url', VITE_SUPABASE_ANON_KEY: 'abc' });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.code, 'invalid-url');
  });

  it('rejects a service-role style key', () => {
    const result = readSupabaseConfig({ VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_ANON_KEY: 'sb_secret_' + 'a'.repeat(40) });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.code, 'privileged-key');
  });

  it('accepts a publishable key', () => {
    const result = readSupabaseConfig({ VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_ANON_KEY: 'sb_publishable_' + 'a'.repeat(24) });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.url, 'https://example.supabase.co');
  });

  it('accepts a valid legacy anon JWT', () => {
    const payload = { role: 'anon' };
    const encoded = btoa(JSON.stringify(payload)).replace(/=+$/, '');
    const token = `header.${encoded}.signature`;
    const result = readSupabaseConfig({ VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_ANON_KEY: token });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.url, 'https://example.supabase.co');
  });

  it('rejects a valid JWT with the wrong role', () => {
    const payload = { role: 'service_role' };
    const encoded = btoa(JSON.stringify(payload)).replace(/=+$/, '');
    const token = `header.${encoded}.signature`;
    const result = readSupabaseConfig({ VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_ANON_KEY: token });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.code, 'privileged-key');
  });
});
