/// <reference types="vite/client" />

import type { SpeakflowBridgeAPI } from '@shared/types'

declare global {
  interface Window {
    speakflow: SpeakflowBridgeAPI
  }
}
