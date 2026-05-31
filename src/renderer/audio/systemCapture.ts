/**
 * Acquires the system audio (WASAPI loopback via Chromium) through
 * getDisplayMedia. The main process's setDisplayMediaRequestHandler
 * intercepts this call and returns audio:'loopback'.
 *
 * IMPORTANT: Do NOT stop the video tracks — the loopback audio source
 * may be tied to the video source being active. We simply ignore video.
 */
export async function getSystemAudioStream(): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    audio: true,
    // Minimal video constraints to reduce GPU/CPU overhead
    video: {
      frameRate: { ideal: 1, max: 1 },
      width: { ideal: 1 },
      height: { ideal: 1 },
    },
  })
  return stream
}
