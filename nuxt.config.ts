import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      dataEndpoints: {
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
