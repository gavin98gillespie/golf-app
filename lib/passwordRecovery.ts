type AuthResult = { error: { message: string } | null };
type RecoveryAuth = {
  resetPasswordForEmail: (email: string) => Promise<AuthResult>;
  verifyOtp: (input: { email: string; token: string; type: 'recovery' }) => Promise<AuthResult>;
  updateUser: (input: { password: string }) => Promise<AuthResult>;
  signOut: (input: { scope: 'local' }) => Promise<AuthResult>;
};

/** Uses a non-persisted auth client: verifying a code must not sign into the app. */
export class PasswordRecovery {
  private email: string | null = null;
  private verified = false;
  constructor(private readonly auth: RecoveryAuth) {}

  async request(email: string) {
    this.verified = false;
    this.email = null;
    const normalized = email.trim().toLowerCase();
    const { error } = await this.auth.resetPasswordForEmail(normalized);
    if (error) throw error;
    this.email = normalized;
  }

  async verify(token: string) {
    this.verified = false;
    if (!this.email) throw new Error('Request a new code first.');
    const { error } = await this.auth.verifyOtp({
      email: this.email,
      token: token.trim(),
      type: 'recovery',
    });
    if (error) throw error;
    this.verified = true;
  }

  async update(password: string) {
    if (!this.verified) throw new Error('Verify your recovery code first.');
    const { error } = await this.auth.updateUser({ password });
    if (error) throw error;
    this.verified = false;
    await this.auth.signOut({ scope: 'local' });
  }

  async dispose() {
    this.email = null;
    this.verified = false;
    await this.auth.signOut({ scope: 'local' });
  }
}
