import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PasswordRecovery } from '../lib/passwordRecovery';

test('password recovery requires a verified recovery code and clears access after success', async () => {
  const calls: unknown[] = [];
  let invalid = true;
  const recovery = new PasswordRecovery({
    resetPasswordForEmail: async (email) => {
      calls.push(email);
      return { error: null };
    },
    verifyOtp: async (input) => {
      calls.push(input);
      return { error: invalid ? { message: 'Expired code' } : null };
    },
    updateUser: async (input) => {
      calls.push(input);
      return { error: null };
    },
    signOut: async (input) => {
      calls.push(input);
      return { error: null };
    },
  });
  await assert.rejects(recovery.update('new-password'));
  await recovery.request(' Golfer@Example.com ');
  await assert.rejects(recovery.verify('12345678'));
  await assert.rejects(recovery.update('new-password'));
  invalid = false;
  await recovery.verify('12345678');
  await recovery.update('new-password');
  assert.deepEqual(calls.at(-1), { scope: 'local' });
  assert.deepEqual(calls[1], { email: 'golfer@example.com', token: '12345678', type: 'recovery' });
  await assert.rejects(recovery.update('another-password'));
});

test('requesting another code invalidates previously verified access', async () => {
  const ok = async () => ({ error: null });
  const recovery = new PasswordRecovery({
    resetPasswordForEmail: ok,
    verifyOtp: ok,
    updateUser: ok,
    signOut: ok,
  });
  await recovery.request('golfer@example.com');
  await recovery.verify('12345678');
  await recovery.request('golfer@example.com');
  await assert.rejects(recovery.update('new-password'));
  await recovery.dispose();
  await assert.rejects(recovery.verify('12345678'));
});
