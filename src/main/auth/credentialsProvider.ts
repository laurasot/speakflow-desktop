/**
 * Abstraction over how credentials are obtained.
 * v1: StaticCredentialsProvider reads userId from settings.json.
 * vNext: JwtCredentialsProvider handles login + token refresh.
 */
export interface CredentialsProvider {
  getUserId(): string
  /** Returns headers to attach to the WS upgrade request, or undefined if none. */
  getAuthHeaders(): Record<string, string> | undefined
  isConfigured(): boolean
}
