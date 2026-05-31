import type { CredentialsProvider } from './credentialsProvider'
import { getSettings } from '../config/settings'

export class StaticCredentialsProvider implements CredentialsProvider {
  getUserId(): string {
    return getSettings().userId
  }

  getAuthHeaders(): Record<string, string> | undefined {
    const userId = this.getUserId()
    if (!userId) return undefined
    return { 'X-User-Id': userId }
  }

  isConfigured(): boolean {
    const { userId, backendUrl } = getSettings()
    return userId.trim().length > 0 && backendUrl.trim().length > 0
  }
}
