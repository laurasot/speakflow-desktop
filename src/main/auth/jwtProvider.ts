import type { CredentialsProvider } from './credentialsProvider'

/**
 * Future implementation: obtain userId and JWT from a login flow,
 * refresh tokens before expiry, and attach Authorization header to WS.
 *
 * Not wired in v1 — use StaticCredentialsProvider instead.
 */
export class JwtCredentialsProvider implements CredentialsProvider {
  constructor(
    private readonly tokenAccessor: () => string | null,
    private readonly userIdAccessor: () => string
  ) {}

  getUserId(): string {
    return this.userIdAccessor()
  }

  getAuthHeaders(): Record<string, string> | undefined {
    const token = this.tokenAccessor()
    const userId = this.userIdAccessor()
    if (!token && !userId) return undefined
    const headers: Record<string, string> = {}
    if (userId) headers['X-User-Id'] = userId
    if (token) headers['Authorization'] = `Bearer ${token}`
    return headers
  }

  isConfigured(): boolean {
    return Boolean(this.tokenAccessor() && this.userIdAccessor())
  }
}
