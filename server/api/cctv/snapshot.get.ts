import { spawn } from 'node:child_process'
import { getCctvRtspUrl } from '../../utils/cctv'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const channel = (query.channel as string) || '1'
  // Strictly enforce sub-channel (stream=1) for fast snapshot capture
  const streamQuality = 1

  const rtspUrl = getCctvRtspUrl(channel, streamQuality)

  setHeader(event, 'Content-Type', 'image/jpeg')
  setHeader(event, 'Cache-Control', 'no-cache, no-store, must-revalidate')

  return new Promise<Buffer>((resolve, reject) => {
    const ffmpegArgs = [
      '-rtsp_transport', 'tcp',
      '-timeout', '4000000',
      '-i', rtspUrl,
      '-vframes', '1',
      '-f', 'image2pipe',
      '-q:v', '2',
      '-'
    ]

    const ffmpeg = spawn('ffmpeg', ffmpegArgs, {
      stdio: ['ignore', 'pipe', 'pipe']
    })

    const chunks: Buffer[] = []

    ffmpeg.stdout.on('data', (chunk) => {
      chunks.push(chunk)
    })

    ffmpeg.on('close', (code) => {
      if (code === 0 && chunks.length > 0) {
        resolve(Buffer.concat(chunks))
      } else {
        reject(createError({
          statusCode: 502,
          statusMessage: `Failed to capture snapshot from CCTV channel ${channel}`
        }))
      }
    })

    ffmpeg.on('error', (err) => {
      reject(createError({
        statusCode: 500,
        statusMessage: `FFmpeg error: ${err.message}`
      }))
    })

    // Timeout safety
    const timeout = setTimeout(() => {
      if (!ffmpeg.killed) {
        ffmpeg.kill('SIGKILL')
      }
      reject(createError({
        statusCode: 504,
        statusMessage: 'CCTV snapshot capture timed out'
      }))
    }, 6000)

    event.node.req.on('close', () => {
      clearTimeout(timeout)
      if (!ffmpeg.killed) ffmpeg.kill('SIGKILL')
    })
  })
})
