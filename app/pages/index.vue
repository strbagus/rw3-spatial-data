<script setup lang="ts">
const { data: spatialData } = await useRw3SpatialData()

const enabledLayers = computed(() => spatialData.value?.layers || { wilayah: true, cctv: true, pengurus: true })
const enabledCount = computed(() => Object.values(enabledLayers.value).filter(Boolean).length)

const totalRt = computed(() => spatialData.value?.wilayah?.features?.length || 0)
const totalCctv = computed(() => spatialData.value?.cctv?.features?.length || 0)
const totalPengurus = computed(() => spatialData.value?.pengurus?.features?.length || 0)
</script>

<template>
  <div
    class="min-h-screen bg-base-200 text-base-content flex flex-col justify-between selection:bg-primary selection:text-primary-content">
    <!-- Navbar / Minimal Header -->
    <header class="border-b border-base-300/60 bg-base-100/70 backdrop-blur-md sticky top-0 z-50">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9">
            <img src="/favicon.svg" class="">
          </div>
          <div>
            <h1 class="font-bold text-sm sm:text-base leading-tight tracking-tight">Data Spasial RW 03</h1>
            <p class="text-[11px] text-base-content/60 font-medium">Kampung Timuran, Yogyakarta</p>
          </div>
        </div>

        <NuxtLink to="/map" class="btn btn-sm btn-primary gap-1.5 shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <span>Buka Peta</span>
        </NuxtLink>
      </div>
    </header>

    <!-- Main Content Container -->
    <main class="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 flex flex-col justify-center">
      <!-- Hero Welcome Section -->
      <div class="text-center max-w-3xl mx-auto space-y-5">
        <div
          class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-base-100 border border-base-300 shadow-sm text-xs font-semibold text-primary">
          <span class="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Sistem Informasi Geografis & Data Terpadu
        </div>

        <h2 class="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight sm:leading-tight">
          Selamat Datang di Laman Data Spasial <span class="text-primary">RW 03</span> Kampung Timuran
        </h2>

        <p class="text-base sm:text-lg text-base-content/75 max-w-2xl mx-auto leading-relaxed">
          Portal informasi geospasial terintegrasi untuk wilayah RW 03 Kampung Timuran, Kota Yogyakarta. Menyajikan
          pemetaan batas wilayah RT, persebaran jaringan kamera CCTV lingkungan, serta informasi lokasi dan kontak
          pengurus warga.
        </p>

        <!-- CTA Buttons -->
        <div class="pt-2 flex flex-wrap items-center justify-center gap-3">
          <NuxtLink to="/map"
            class="btn btn-primary btn-md sm:btn-lg gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Eksplorasi Peta Interaktif
          </NuxtLink>
        </div>
      </div>

      <!-- Quick Metrics Summary -->
      <div 
        v-if="enabledCount > 0"
        class="grid gap-3 sm:gap-6 my-10 sm:my-12 max-w-3xl mx-auto w-full"
        :class="{
          'grid-cols-3': enabledCount >= 3,
          'grid-cols-2': enabledCount === 2,
          'grid-cols-1': enabledCount === 1
        }"
      >
        <div v-if="enabledLayers.wilayah" class="card bg-base-100 border border-base-300/70 shadow-sm p-4 text-center">
          <div class="text-2xl sm:text-3xl font-extrabold text-amber-500">{{ totalRt }}</div>
          <div class="text-xs sm:text-sm font-medium text-base-content/70 mt-0.5">Rukun Tetangga (RT)</div>
        </div>
        <div v-if="enabledLayers.cctv" class="card bg-base-100 border border-base-300/70 shadow-sm p-4 text-center">
          <div class="text-2xl sm:text-3xl font-extrabold text-cyan-500">{{ totalCctv }}</div>
          <div class="text-xs sm:text-sm font-medium text-base-content/70 mt-0.5">Titik Pantau CCTV</div>
        </div>
        <div v-if="enabledLayers.pengurus" class="card bg-base-100 border border-base-300/70 shadow-sm p-4 text-center">
          <div class="text-2xl sm:text-3xl font-extrabold text-indigo-500">{{ totalPengurus }}</div>
          <div class="text-xs sm:text-sm font-medium text-base-content/70 mt-0.5">Pengurus Wilayah</div>
        </div>
      </div>

      <!-- Data Category Highlights Cards -->
      <div 
        v-if="enabledCount > 0"
        class="grid gap-5"
        :class="{
          'grid-cols-1 md:grid-cols-3': enabledCount >= 3,
          'grid-cols-1 md:grid-cols-2': enabledCount === 2,
          'grid-cols-1': enabledCount === 1
        }"
      >
        <!-- Wilayah Card -->
        <div
          v-if="enabledLayers.wilayah"
          class="card bg-base-100 border border-base-300/70 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
          <div class="card-body p-6">
            <div class="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 class="card-title text-lg font-bold">Batas Wilayah RT</h3>
            <p class="text-xs sm:text-sm text-base-content/70 leading-relaxed">
              Pemetaan polygon digital cakupan wilayah RT 07, RT 08, dan RT 09 di lingkungan RW 03 secara presisi untuk
              mempermudah penataan administratif.
            </p>
          </div>
        </div>

        <!-- CCTV Card -->
        <div
          v-if="enabledLayers.cctv"
          class="card bg-base-100 border border-base-300/70 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
          <div class="card-body p-6">
            <div class="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 class="card-title text-lg font-bold">Titik Pantau CCTV</h3>
            <p class="text-xs sm:text-sm text-base-content/70 leading-relaxed">
              Informasi titik sebaran kamera pengawas di akses gerbang masuk, pos ronda, dan area publik lingkungan
              warga RW 03.
            </p>
          </div>
        </div>

        <!-- Pengurus Card -->
        <div
          v-if="enabledLayers.pengurus"
          class="card bg-base-100 border border-base-300/70 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
          <div class="card-body p-6">
            <div class="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 class="card-title text-lg font-bold">Lokasi & Kontak Pengurus</h3>
            <p class="text-xs sm:text-sm text-base-content/70 leading-relaxed">
              Direktori titik domisili Ketua RW dan RT beserta masa periode bakti dan akses komunikasi langsung ke nomor
              kontak WhatsApp pengurus.
            </p>
          </div>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="border-t border-base-300/60 bg-base-100/50 py-6 text-center text-xs text-base-content/60">
      <div class="max-w-6xl mx-auto px-4">
        <p>© 2026 RW 03 Kampung Timuran, Kemantren Mergangsan, Kota Yogyakarta.</p>
        <p class="mt-1 text-[11px] text-base-content/40">Sistem Informasi Data Spasial & Pemetaan Wilayah Digital</p>
      </div>
    </footer>
  </div>
</template>
