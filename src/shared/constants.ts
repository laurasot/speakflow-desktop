export const SAMPLE_RATE = 16_000
export const CHANNELS = 1
export const CHUNK_MS = 500
export const FRAME_SIZE = (SAMPLE_RATE * CHUNK_MS) / 1000 // 8 000 samples

/** Maximum queued chunks while WS is disconnected (≈60 s of audio) */
export const RING_QUEUE_CAPACITY = 120

/** WebSocket heartbeat interval in ms */
export const HEARTBEAT_INTERVAL_MS = 20_000

/** WebSocket pong timeout in ms — close and reconnect if exceeded */
export const PONG_TIMEOUT_MS = 10_000

/** Reconnection backoff delays in ms */
export const RECONNECT_DELAYS_MS = [500, 1_000, 2_000, 4_000, 8_000, 16_000, 30_000]
