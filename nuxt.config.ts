import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
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
