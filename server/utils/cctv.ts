export const getCctvChannelNumber = (rawId: string | number): number => {
  if (typeof rawId === 'number') return rawId
  const match = rawId.match(/\d+/)
  return match ? parseInt(match[0], 10) : 1
}

export const getCctvRtspUrl = (channelId: string | number, stream: number = 1): string => {
  const config = useRuntimeConfig()
  const cctvConfig = config.cctv || {}

  const host = cctvConfig.nvrHost || '192.168.1.14'
  const port = cctvConfig.nvrPort || 554
  const user = cctvConfig.nvrUser || 'admin'
  const password = cctvConfig.nvrPassword || ''
  const pattern = cctvConfig.rtspPathPattern || '/avstream/channel={channel}/stream={stream}.sdp'

  const channelNumber = getCctvChannelNumber(channelId)
  const path = pattern
    .replace('{channel}', String(channelNumber))
    .replace('{stream}', String(stream))

  const auth = password ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}@` : (user ? `${encodeURIComponent(user)}@` : '')
  return `rtsp://${auth}${host}:${port}${path.startsWith('/') ? path : '/' + path}`
}
