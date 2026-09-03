import { spawn } from 'node:child_process'
import { getCctvRtspUrl } from '../../utils/cctv'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const channel = (query.channel as string) || '1'
  // Strictly enforce sub-channel (stream=1, 352p @ 15fps) to conserve bandwidth & server CPU
  const streamQuality = 1

  const rtspUrl = getCctvRtspUrl(channel, streamQuality)

  // Set response headers for MJPEG stream
  setHeader(event, 'Content-Type', 'multipart/x-mixed-replace; boundary=ffserver')
  setHeader(event, 'Cache-Control', 'no-cache, no-store, must-revalidate, pre-check=0, post-check=0, max-age=0')
  setHeader(event, 'Pragma', 'no-cache')
  setHeader(event, 'Expires', '0')
  setHeader(event, 'Connection', 'close')

  // Spawn ffmpeg to convert RTSP to MJPEG stream
  const ffmpegArgs = [
    '-rtsp_transport', 'tcp',
    '-timeout', '5000000',
    '-i', rtspUrl,
    '-f', 'mpjpeg',
    '-boundary_tag', 'ffserver',
    '-q:v', '3',
    '-r', '15',
    '-'
  ]

  const ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
    stdio: ['ignore', 'pipe', 'pipe']
  })

  ffmpegProcess.stdout.pipe(event.node.res)

  return new Promise<void>((resolve) => {
    let isCleanedUp = false

    const cleanup = () => {
      if (isCleanedUp) return
      isCleanedUp = true

      if (ffmpegProcess && !ffmpegProcess.killed) {
        try {
          ffmpegProcess.kill('SIGKILL')
        } catch (_) {}
      }
      resolve()
    }

    event.node.req.on('close', cleanup)
    event.node.res.on('close', cleanup)
    event.node.req.on('end', cleanup)

    ffmpegProcess.on('exit', () => cleanup())
    ffmpegProcess.on('error', (err) => {
      console.error(`[CCTV Stream] FFmpeg error on channel ${channel}:`, err.message)
      cleanup()
    })
  })
})
