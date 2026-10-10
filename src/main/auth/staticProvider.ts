import type { CredentialsProvider } from './credentialsProvider'
import { getSettings } from '../config/settings'

export class StaticCredentialsProvider implements CredentialsProvider {
  getUserId(): string {
    return getSettings().userId
  }

  getAuthHeaders(): Record<string, string> | undefined {
    const apiKey = getSettings().apiKey.trim()
    if (!apiKey) return undefined
    return { Authorization: `Bearer ${apiKey}` }
  }

  isConfigured(): boolean {
    const { userId, backendUrl, apiKey } = getSettings()
    return userId.trim().length > 0 && backendUrl.trim().length > 0 && apiKey.trim().length > 0
  }
}
