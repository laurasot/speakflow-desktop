import { z } from 'zod'
import { CHUNK_MS, SAMPLE_RATE, CHANNELS } from '@shared/constants'

export const settingsSchema = z.object({
  userId: z.string().default(''),
  backendUrl: z.string().default(''),
  chunkMs: z.literal(CHUNK_MS).default(CHUNK_MS),
  sampleRate: z.literal(SAMPLE_RATE).default(SAMPLE_RATE),
  channels: z.literal(CHANNELS).default(CHANNELS),
})

export type SettingsSchema = z.infer<typeof settingsSchema>
