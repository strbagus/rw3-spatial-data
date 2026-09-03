<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  cctv: {
    id: string
    name: string
    category?: string
    rt?: string
    description?: string
    [key: string]: any
  } | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const videoContainer = ref<HTMLDivElement | null>(null)
const isLoading = ref(true)
const hasError = ref(false)
const streamKey = ref(Date.now())
const isFullscreen = ref(false)

// Parse numeric channel from CCTV id (e.g., "D01" -> 1)
const channelNumber = computed(() => {
  if (!props.cctv?.id) return 1
  const match = props.cctv.id.match(/\d+/)
  return match ? parseInt(match[0], 10) : 1
})

// Active stream URL locked to sub-channel (stream=1) for bandwidth & CPU efficiency
const streamUrl = computed(() => {
  if (!props.cctv) return ''
  return `/api/cctv/stream?channel=${channelNumber.value}&stream=1&t=${streamKey.value}`
})

// Reset state when a new CCTV is opened
watch(
  () => props.cctv,
  (newVal) => {
    if (newVal) {
      isLoading.value = true
      hasError.value = false
      streamKey.value = Date.now()
    }
  }
)

const onStreamLoad = () => {
  isLoading.value = false
  hasError.value = false
}

const onStreamError = () => {
  isLoading.value = false
  hasError.value = true
}

const reloadStream = () => {
  isLoading.value = true
  hasError.value = false
  streamKey.value = Date.now()
}

const toggleFullscreen = () => {
  if (!videoContainer.value) return
  if (!document.fullscreenElement) {
    videoContainer.value.requestFullscreen().catch(() => {})
    isFullscreen.value = true
  } else {
    document.exitFullscreen().catch(() => {})
    isFullscreen.value = false
  }
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    emit('close')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  document.addEventListener('fullscreenchange', () => {
    isFullscreen.value = !!document.fullscreenElement
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <!-- Modal Dialog Backdrop -->
  <transition name="modal-fade">
    <div 
      v-if="cctv" 
      class="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm"
      @click.self="emit('close')"
    >
      <div 
        class="card bg-base-100 w-full max-w-3xl shadow-2xl border border-base-content/10 overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95 duration-200"
      >
        <!-- Modal Header -->
        <div class="p-3 sm:p-4 border-b border-base-200 flex items-center justify-between gap-3 bg-base-200/50">
          <div class="flex items-center gap-2.5 min-w-0">
            <!-- Pulsing Live Indicator -->
            <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-error/15 border border-error/30 text-error shrink-0 text-xs font-bold">
              <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-error"></span>
              </span>
              <span>LIVE</span>
            </div>

            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <h3 class="font-bold text-sm sm:text-base text-base-content truncate">
                  {{ cctv.name }}
                </h3>
                <span class="badge badge-info badge-xs sm:badge-sm font-semibold shrink-0">
                  CH {{ channelNumber }}
                </span>
              </div>
              <p class="text-[11px] text-base-content/60 truncate">
                ID: {{ cctv.id }} {{ cctv.rt ? `• Wilayah RT ${cctv.rt}` : '' }} • {{ cctv.description || 'Kamera Pantau CCTV' }}
              </p>
            </div>
          </div>

          <!-- Close Action -->
          <button 
            class="btn btn-sm btn-ghost btn-circle shrink-0 hover:bg-base-content/10" 
            @click="emit('close')" 
            title="Tutup (Esc)"
          >
            ✕
          </button>
        </div>

        <!-- Video Stream Player Viewport -->
        <div 
          ref="videoContainer"
          class="relative bg-neutral flex items-center justify-center overflow-hidden aspect-video w-full group select-none"
        >
          <!-- Live Stream Image Tag -->
          <img 
            v-if="!hasError"
            :src="streamUrl" 
            :alt="`CCTV Live Stream - ${cctv.name}`"
            class="w-full h-full object-contain"
            @load="onStreamLoad"
            @error="onStreamError"
          />

          <!-- Loading Spinner Overlay -->
          <div 
            v-if="isLoading && !hasError" 
            class="absolute inset-0 bg-neutral/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-neutral-content"
          >
            <span class="loading loading-spinner loading-lg text-primary"></span>
            <span class="text-xs font-medium tracking-wide">Menghubungkan ke stream kamera...</span>
            <span class="text-[10px] opacity-70">Channel {{ channelNumber }} • Sub-channel (352p)</span>
          </div>

          <!-- Error State Overlay -->
          <div 
            v-if="hasError" 
            class="absolute inset-0 bg-base-300/95 p-6 flex flex-col items-center justify-center text-center gap-3 text-base-content"
          >
            <div class="w-12 h-12 rounded-full bg-error/15 text-error flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h4 class="font-bold text-sm">Gagal Menghubungkan ke Kamera</h4>
              <p class="text-xs text-base-content/70 mt-1 max-w-sm">
                Stream RTSP di channel {{ channelNumber }} tidak merespons atau perangkat NVR offline.
              </p>
            </div>
            <button class="btn btn-sm btn-primary gap-1.5" @click="reloadStream">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Coba Hubungkan Kembali
            </button>
          </div>

          <!-- Quick Top Right Controls on Video Player -->
          <div class="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              class="btn btn-xs btn-circle bg-black/60 hover:bg-black/80 text-white border-0"
              @click="toggleFullscreen"
              title="Layar Penuh"
            >
              <svg v-if="!isFullscreen" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Modal Controls Bar -->
        <div class="p-3 sm:p-3.5 bg-base-100 border-t border-base-200 flex items-center justify-between gap-2.5">
          <!-- Actions -->
            <button 
              class="btn btn-xs btn-outline border-base-content/20 gap-1"
              @click="reloadStream" 
              title="Refresh Stream"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>

            <button 
              class="btn btn-xs btn-primary gap-1" 
              @click="toggleFullscreen"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
              </svg>
              <span>Fullscreen</span>
            </button>
        </div>

        <!-- Footer Info -->
        <div class="px-3.5 py-2 bg-base-200/60 border-t border-base-200 text-[10px] sm:text-[11px] text-base-content/60 flex items-center justify-between">
          <span>Pantauan Keamanan Lingkungan RW 03</span>
          <span class="font-mono">15 FPS • Live</span>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
