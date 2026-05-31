import { SAMPLE_RATE, CHANNELS } from '@shared/constants'

/**
 * Acquires a microphone MediaStream with settings optimized for ASR:
 * raw capture (no echo cancellation, no noise suppression, no AGC).
 */
export async function getMicrophoneStream(deviceId?: string): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      sampleRate: SAMPLE_RATE,
      channelCount: CHANNELS,
    },
    video: false,
  })
}

export async function listAudioInputDevices(): Promise<MediaDeviceInfo[]> {
  // Trigger permission prompt if needed before enumerating
  try {
    const probe = await navigator.mediaDevices.getUserMedia({ audio: true })
    probe.getTracks().forEach((t) => t.stop())
  } catch {
    // permission denied — return empty list
    return []
  }

  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices.filter((d) => d.kind === 'audioinput')
}
