/**
 * Startup/capture timing probes. Messages prefixed with "[perf]" are forwarded
 * by the main process to main.log (see window/mainWindow.ts).
 */
export async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const t0 = performance.now()
  try {
    return await fn()
  } finally {
    console.info(`[perf] ${label} ${Math.round(performance.now() - t0)}ms`)
  }
}

export function mark(label: string): void {
  console.info(`[perf] ${label} @${Math.round(performance.now())}ms since page load`)
}
