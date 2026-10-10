/**
 * Abstraction over how credentials are obtained.
 * v1: StaticCredentialsProvider sends the per-user API key from settings.json as a Bearer token.
 * The backend derives the user identity from that key; userId is only echoed in start_session.
 * vNext: JwtCredentialsProvider handles login + token refresh.
 */
export interface CredentialsProvider {
  getUserId(): string
  /** Returns headers to attach to the WS upgrade request, or undefined if none. */
  getAuthHeaders(): Record<string, string> | undefined
  isConfigured(): boolean
}
