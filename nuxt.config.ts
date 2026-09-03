import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  runtimeConfig: {
    cctv: {
      nvrHost: process.env.CCTV_NVR_HOST || '192.168.1.14',
      nvrPort: Number(process.env.CCTV_NVR_PORT) || 554,
      nvrUser: process.env.CCTV_NVR_USER || 'admin',
      nvrPassword: process.env.CCTV_NVR_PASSWORD || '',
      rtspPathPattern: process.env.CCTV_RTSP_PATTERN || '/avstream/channel={channel}/stream={stream}.sdp'
    },
    public: {
      dataEndpoints: {
        layers: 'https://s3.strbagus.com/rw3-timuran/layers.json',
        wilayah: 'https://s3.strbagus.com/rw3-timuran/wilayah.json',
        cctv: 'https://s3.strbagus.com/rw3-timuran/cctv.json',
        pengurus: 'https://s3.strbagus.com/rw3-timuran/pengurus.json'
      }
    }
  },
  css: [
    'leaflet/dist/leaflet.css',
    '~/assets/style.css'
  ],
  vite: {
    plugins: [
      tailwindcss()
    ]
  }
})
