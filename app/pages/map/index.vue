<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const { data: spatialData, pending, error } = await useRw3SpatialData()

const mapContainer = ref<HTMLDivElement | null>(null)
let mapInstance: any = null
let LInstance: any = null

// Leaflet Layer Instances
let geoJsonPolygonLayer: any = null
let cctvLayerGroup: any = null
let pengurusLayerGroup: any = null

// UI State
const showSidebar = ref(false)
const showDisclaimerAlert = ref(true)
const activeTab = ref<'all' | 'wilayah' | 'cctv' | 'pengurus'>('all')
const searchQuery = ref('')
const selectedItemId = ref<string | null>(null)

// Layer Visibility Toggles
const layerVisibility = ref({
  wilayah: true,
  cctv: true,
  pengurus: true
})

const rtVisibility = ref<Record<string, boolean>>({
  '07': true,
  '08': true,
  '09': true
})

const rtColors: Record<string, string> = {
  '07': '#f59e0b',
  '08': '#3b82f6',
  '09': '#10b981'
}

// Data Lists
const wilayahList = computed(() => spatialData.value?.wilayah?.features || [])
const cctvList = computed(() => spatialData.value?.cctv?.features || [])
const pengurusList = computed(() => spatialData.value?.pengurus?.features || [])

// Combined & Filtered Items for Sidebar
const filteredItems = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  let list: Array<{
    id: string
    category: 'wilayah' | 'cctv' | 'pengurus'
    title: string
    subtitle: string
    badge: string
    badgeClass: string
    data: any
  }> = []

  if (activeTab.value === 'all' || activeTab.value === 'wilayah') {
    wilayahList.value.forEach((w) => {
      const rt = w.properties.rt
      list.push({
        id: `rt-${rt}`,
        category: 'wilayah',
        title: `Wilayah RT ${rt}`,
        subtitle: `RW ${w.properties.rw || '03'} • Batas Polygon`,
        badge: `RT ${rt}`,
        badgeClass: 'badge-primary',
        data: w
      })
    })
  }

  if (activeTab.value === 'all' || activeTab.value === 'cctv') {
    cctvList.value.forEach((c) => {
      list.push({
        id: c.properties.id,
        category: 'cctv',
        title: c.properties.name,
        subtitle: c.properties.rt ? `RT ${c.properties.rt} • Titik CCTV` : 'Titik Pantau CCTV',
        badge: 'CCTV',
        badgeClass: 'badge-info',
        data: c
      })
    })
  }

  if (activeTab.value === 'all' || activeTab.value === 'pengurus') {
    pengurusList.value.forEach((p) => {
      const isRW = p.properties.jabatan === 'RW'
      list.push({
        id: p.properties.id,
        category: 'pengurus',
        title: p.properties.name,
        subtitle: `${isRW ? 'Ketua RW' : 'Ketua RT'} • RT ${p.properties.rt}`,
        badge: p.properties.jabatan,
        badgeClass: isRW ? 'badge-primary font-bold' : 'badge-secondary',
        data: p
      })
    })
  }

  if (!q) return list

  return list.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q) ||
      item.badge.toLowerCase().includes(q)
  )
})

onMounted(async () => {
  if (!mapContainer.value) return

  const L = await import('leaflet')
  LInstance = L

  // Initialize Map with Canvas renderer and extended deep maxZoom
  mapInstance = L.map(mapContainer.value, {
    preferCanvas: true,
    zoomControl: false,
    maxZoom: 23
  })

  // Base Layers with Deep Over-Zooming Support (maxNativeZoom & maxZoom)
  const satelliteLayer = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
      maxNativeZoom: 19,
      maxZoom: 23,
      attribution: '&copy; Esri, Maxar, Earthstar Geographics'
    }
  ).addTo(mapInstance)

  const googleHybridLayer = L.tileLayer(
    'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    {
      maxNativeZoom: 20,
      maxZoom: 23,
      attribution: '&copy; Google Maps'
    }
  )

  const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxNativeZoom: 19,
    maxZoom: 23,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
  })

  // Zoom control
  L.control.zoom({ position: 'bottomright' }).addTo(mapInstance)

  // Layer control
  L.control
    .layers(
      {
        'Esri Satellite': satelliteLayer,
        'Google Hybrid': googleHybridLayer,
        'Street Map (OSM)': osmLayer
      },
      undefined,
      { position: 'bottomright' }
    )
    .addTo(mapInstance)

  // 1. Initialize Wilayah (GeoJSON Polygons)
  initWilayahLayer(L)

  // 2. Initialize Lokasi Groups (CCTV & Pengurus)
  initLokasiLayers(L)

  // Fit bounds and lock zoom/pan bounds
  if (geoJsonPolygonLayer && geoJsonPolygonLayer.getLayers().length > 0) {
    const bounds = geoJsonPolygonLayer.getBounds()
    mapInstance.fitBounds(bounds, {
      padding: [60, 60],
      maxZoom: 18
    })

    const initialZoom = mapInstance.getZoom()
    mapInstance.setMinZoom(initialZoom)
    mapInstance.setMaxBounds(bounds.pad(0.5))
    mapInstance.options.maxBoundsViscosity = 1.0
  }

  // Window Resize
  const handleResize = () => mapInstance?.invalidateSize()
  window.addEventListener('resize', handleResize)
  onUnmounted(() => window.removeEventListener('resize', handleResize))
})

// Initialize Wilayah (Polygons) Layer
const initWilayahLayer = (L: any) => {
  const getStyle = (feature: any) => {
    const rt = feature?.properties?.rt || '07'
    const color = rtColors[rt] || '#6366f1'
    const isVisible = layerVisibility.value.wilayah && rtVisibility.value[rt] !== false
    return {
      color: color,
      weight: isVisible ? 2.5 : 0,
      opacity: isVisible ? 0.9 : 0,
      fillColor: color,
      fillOpacity: isVisible ? 0.35 : 0
    }
  }

  geoJsonPolygonLayer = L.geoJSON((spatialData.value?.wilayah || { type: 'FeatureCollection', features: [] }) as any, {
    style: getStyle,
    onEachFeature: (feature: any, layer: any) => {
      const props = feature.properties || {}
      const rtName = `RT ${props.rt || ''}`
      const rwName = `RW ${props.rw || '03'}`
      const rtColor = rtColors[props.rt] || '#6366f1'

      layer.bindTooltip(
        `<div class="font-bold text-xs px-1">${rtName}</div>`,
        {
          permanent: true,
          direction: 'center',
          className: 'rt-map-label'
        }
      )

      layer.bindPopup(`
        <div class="p-3.5 min-w-[220px]">
          <div class="flex items-center justify-between gap-2 border-b border-base-200 pb-2 mb-2 pr-5">
            <span class="badge font-bold text-white text-xs" style="background-color: ${rtColor}">
              ${rtName}
            </span>
            <span class="text-xs font-semibold text-base-content/70">${rwName} test</span>
          </div>
          <p class="text-xs font-medium text-base-content/80">Wilayah Administratif RT ${props.rt}</p>
          <div class="mt-2 pt-2 border-t border-base-200 flex justify-between text-[11px] text-base-content/60">
            <span>Kategori: Wilayah</span>
            <span>RW ${props.rw}</span>
          </div>
        </div>
      `)

      layer.on({
        mouseover: (e: any) => {
          if (!layerVisibility.value.wilayah) return
          const l = e.target
          l.setStyle({ weight: 4, fillOpacity: 0.65 })
          l.bringToFront()
        },
        mouseout: (e: any) => {
          if (!layerVisibility.value.wilayah) return
          geoJsonPolygonLayer.resetStyle(e.target)
        },
        click: (e: any) => {
          selectedItemId.value = `rt-${props.rt}`
          mapInstance.fitBounds(e.target.getBounds(), { padding: [60, 60] })
        }
      })
    }
  }).addTo(mapInstance)
}

// Initialize Lokasi Layers (CCTV & Pengurus)
const initLokasiLayers = (L: any) => {
  // CCTV Group
  cctvLayerGroup = L.layerGroup()
  cctvList.value.forEach((feat: any) => {
    const props = feat.properties
    const coords = [feat.geometry.coordinates[1], feat.geometry.coordinates[0]]

    // Custom CCTV Icon
    const cctvIcon = L.divIcon({
      className: 'custom-map-icon',
      html: `
        <div class="relative group cursor-pointer">
          <div class="w-8 h-8 rounded-full bg-cyan-600 text-white flex items-center justify-center shadow-lg border-2 border-white transition-transform hover:scale-110">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -18]
    })

    const marker = L.marker(coords, { icon: cctvIcon })
    marker.bindPopup(`
      <div class="p-3.5 min-w-[240px]">
        <div class="flex items-center justify-between gap-2 border-b border-base-200 pb-2 mb-2 pr-5">
          <div class="flex items-center gap-1.5">
            <span class="badge badge-info badge-sm font-bold">CCTV</span>
            <span class="text-xs font-bold text-base-content">${props.name}</span>
          </div>
        </div>
        <p class="text-xs text-base-content/80 mb-2">${props.description || 'Kamera CCTV Wilayah RW 03'}</p>
        <div class="mt-2.5 pt-2 border-t border-base-200 flex justify-end">
          <button class="btn btn-xs btn-primary gap-1 w-full" onclick="alert('Streaming simulasi ${props.name}')">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Live Preview
          </button>
        </div>
      </div>
    `)

    marker.featureId = props.id
    cctvLayerGroup.addLayer(marker)
  })

  if (layerVisibility.value.cctv) {
    cctvLayerGroup.addTo(mapInstance)
  }

  // Pengurus Group
  pengurusLayerGroup = L.layerGroup()
  pengurusList.value.forEach((feat: any) => {
    const props = feat.properties
    const coords = [feat.geometry.coordinates[1], feat.geometry.coordinates[0]]
    const isRW = props.jabatan === 'RW'

    // Custom Pengurus Icon
    const pengurusIcon = L.divIcon({
      className: 'custom-map-icon',
      html: `
        <div class="relative group cursor-pointer">
          <div class="w-8 h-8 rounded-full ${isRW ? 'bg-indigo-600' : 'bg-indigo-500'} text-white flex items-center justify-center shadow-lg border-2 border-white transition-transform hover:scale-110">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          ${
            isRW
              ? `<span class="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white ring-1 ring-white" title="Ketua RW">
                   ★
                 </span>`
              : ''
          }
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -18]
    })

    const marker = L.marker(coords, { icon: pengurusIcon })
    marker.bindPopup(`
      <div class="p-3.5 min-w-[240px]">
        <div class="flex items-center justify-between gap-2 border-b border-base-200 pb-2 mb-2 pr-5">
          <span class="badge ${isRW ? 'badge-primary' : 'badge-secondary'} badge-sm font-bold">${props.jabatan === 'RW' || props.jabatan === 'RT' ? `Ketua ${props.jabatan}` : props.jabatan}</span>
          <span class="text-xs font-semibold text-base-content/60">RW ${props.rw}</span>
        </div>
        <h4 class="font-bold text-sm text-base-content">${props.name}</h4>
        <p class="text-xs text-base-content/70 mt-0.5">${props.address}</p>
        <div class="mt-2 space-y-1 text-[11px] bg-base-200/60 p-2 rounded-lg border border-base-200">
          <div class="flex justify-between">
            <span class="text-base-content/60">Wilayah:</span>
            <span class="font-semibold text-base-content">RT ${props.rt} / RW ${props.rw}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-base-content/60">Periode:</span>
            <span class="text-base-content/80">${props.periode || '2024 - 2029'}</span>
          </div>
        </div>
        <div class="mt-2.5 pt-2 border-t border-base-200 flex gap-2">
          <a 
            href="https://wa.me/${props.phone?.replace(/[^0-9]/g, '')}" 
            target="_blank"
            class="btn btn-xs btn-success text-white w-full gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
            </svg>
            Hubungi WhatsApp
          </a>
        </div>
      </div>
    `)

    marker.featureId = props.id
    pengurusLayerGroup.addLayer(marker)
  })

  if (layerVisibility.value.pengurus) {
    pengurusLayerGroup.addTo(mapInstance)
  }
}

// Reactively toggle layers
watch(
  () => layerVisibility.value.wilayah,
  (val) => {
    if (!geoJsonPolygonLayer || !mapInstance) return
    if (val) {
      if (!mapInstance.hasLayer(geoJsonPolygonLayer)) {
        geoJsonPolygonLayer.addTo(mapInstance)
      }
    } else {
      if (mapInstance.hasLayer(geoJsonPolygonLayer)) {
        mapInstance.removeLayer(geoJsonPolygonLayer)
      }
    }
  }
)

watch(
  () => layerVisibility.value.cctv,
  (val) => {
    if (!cctvLayerGroup || !mapInstance) return
    if (val) {
      if (!mapInstance.hasLayer(cctvLayerGroup)) {
        cctvLayerGroup.addTo(mapInstance)
      }
    } else {
      if (mapInstance.hasLayer(cctvLayerGroup)) {
        mapInstance.removeLayer(cctvLayerGroup)
      }
    }
  }
)

watch(
  () => layerVisibility.value.pengurus,
  (val) => {
    if (!pengurusLayerGroup || !mapInstance) return
    if (val) {
      if (!mapInstance.hasLayer(pengurusLayerGroup)) {
        pengurusLayerGroup.addTo(mapInstance)
      }
    } else {
      if (mapInstance.hasLayer(pengurusLayerGroup)) {
        mapInstance.removeLayer(pengurusLayerGroup)
      }
    }
  }
)

// Reactively toggle specific RTs
watch(
  rtVisibility,
  () => {
    if (!geoJsonPolygonLayer) return
    geoJsonPolygonLayer.setStyle((feature: any) => {
      const rt = feature?.properties?.rt || '07'
      const color = rtColors[rt] || '#6366f1'
      const isVisible = layerVisibility.value.wilayah && rtVisibility.value[rt] !== false
      return {
        color: color,
        weight: isVisible ? 2.5 : 0,
        opacity: isVisible ? 0.9 : 0,
        fillColor: color,
        fillOpacity: isVisible ? 0.35 : 0
      }
    })
  },
  { deep: true }
)

// Focus Item Action from Sidebar
const focusItem = (item: any) => {
  selectedItemId.value = item.id
  if (!mapInstance) return

  if (item.category === 'wilayah') {
    // Ensure wilayah layer is enabled
    layerVisibility.value.wilayah = true
    const rt = item.data.properties.rt
    rtVisibility.value[rt] = true

    geoJsonPolygonLayer.eachLayer((layer: any) => {
      if (layer.feature?.properties?.rt === rt) {
        mapInstance.fitBounds(layer.getBounds(), { padding: [80, 80], maxZoom: 21 })
        layer.openPopup()
      }
    })
  } else if (item.category === 'cctv') {
    layerVisibility.value.cctv = true
    cctvLayerGroup.eachLayer((layer: any) => {
      if (layer.featureId === item.id) {
        const latlng = layer.getLatLng()
        mapInstance.flyTo(latlng, 20, { duration: 1 })
        layer.openPopup()
      }
    })
  } else if (item.category === 'pengurus') {
    layerVisibility.value.pengurus = true
    pengurusLayerGroup.eachLayer((layer: any) => {
      if (layer.featureId === item.id) {
        const latlng = layer.getLatLng()
        mapInstance.flyTo(latlng, 20, { duration: 1 })
        layer.openPopup()
      }
    })
  }
}

const resetAllView = () => {
  selectedItemId.value = null
  if (geoJsonPolygonLayer && mapInstance) {
    mapInstance.fitBounds(geoJsonPolygonLayer.getBounds(), {
      padding: [60, 60],
      maxZoom: 18
    })
    mapInstance.closePopup()
  }
}

let alertTimeout: any = null

onMounted(() => {
  // Auto-dismiss dummy data alert after 8 seconds
  alertTimeout = setTimeout(() => {
    showDisclaimerAlert.value = false
  }, 8000)
})

onUnmounted(() => {
  if (alertTimeout) {
    clearTimeout(alertTimeout)
    alertTimeout = null
  }
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }
})
</script>

<template>
  <div class="relative w-screen h-screen overflow-hidden bg-base-100">
    <!-- Top Floating Header -->
    <header class="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 z-[1000] pointer-events-none flex justify-between items-center gap-2 sm:gap-3">
      <!-- Title & Branding Card -->
      <div class="card bg-base-100/90 backdrop-blur-md shadow-xl pointer-events-auto border border-base-content/10 min-w-0 shrink">
        <div class="card-body p-2 sm:p-3 flex-row items-center gap-2 sm:gap-3 min-w-0">
          <NuxtLink to="/" class="btn btn-xs sm:btn-sm btn-ghost btn-circle shrink-0" title="Kembali ke Beranda">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </NuxtLink>
          <div class="min-w-0">
            <h1 class="font-bold text-xs sm:text-base leading-tight truncate">Peta Digital RW 03</h1>
            <p class="text-[11px] text-base-content/70 hidden sm:block truncate">Kategori: Wilayah & Lokasi (CCTV, Pengurus)</p>
          </div>
        </div>
      </div>

      <!-- Header Action Controls -->
      <div class="flex items-center gap-1.5 sm:gap-2 pointer-events-auto shrink-0">
        <button 
          class="btn btn-xs sm:btn-sm shadow-lg gap-1.5 sm:gap-2 px-2.5 sm:px-3"
          :class="showSidebar ? 'btn-primary' : 'btn-outline bg-base-100/90 backdrop-blur border-base-content/20'"
          @click="showSidebar = !showSidebar"
          :title="showSidebar ? 'Tutup Panel Layer' : 'Buka Kategori Layer'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span class="hidden sm:inline">Kategori Layer</span>
          <span class="badge badge-xs sm:badge-sm" :class="showSidebar ? 'badge-neutral' : 'badge-primary'">{{ filteredItems.length }}</span>
        </button>

        <button 
          class="btn btn-xs sm:btn-sm btn-outline bg-base-100/90 backdrop-blur border-base-content/20 shadow-lg gap-1.5 px-2.5 sm:px-3" 
          @click="resetAllView" 
          title="Reset Tampilan Peta"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span class="hidden sm:inline">Reset</span>
        </button>
      </div>
    </header>

    <!-- Side Panel / Layer Category Drawer -->
    <transition name="slide">
      <aside 
        v-if="showSidebar"
        class="absolute top-16 right-3 left-3 sm:left-auto sm:right-4 sm:top-20 z-[1000] sm:w-96 max-h-[calc(100vh-5rem)] sm:max-h-[calc(100vh-6.5rem)] flex flex-col card bg-base-100/95 backdrop-blur-md shadow-2xl border border-base-content/10 overflow-hidden"
      >
        <!-- Panel Header -->
        <div class="p-3 sm:p-4 border-b border-base-200 bg-base-200/50 flex items-center justify-between">
          <div>
            <h2 class="font-bold text-xs sm:text-sm text-base-content">Manajemen Layer & Lokasi</h2>
            <p class="text-[10px] sm:text-[11px] text-base-content/60">Filter layer aktif dan cari titik lokasi</p>
          </div>
          <button class="btn btn-xs btn-ghost btn-circle" @click="showSidebar = false">✕</button>
        </div>

        <!-- Layer Toggle Switches -->
        <div class="p-2.5 sm:p-3 border-b border-base-200 space-y-1.5 sm:space-y-2 bg-base-100">
          <div class="text-[11px] sm:text-xs font-semibold text-base-content/70">Tampilkan Kategori Layer:</div>
          <div class="grid grid-cols-3 gap-1.5">
            <!-- Wilayah Toggle -->
            <label class="cursor-pointer label p-1.5 sm:p-2 rounded-lg bg-base-200/60 border border-base-200 flex flex-col items-center gap-1 hover:bg-base-200 transition">
              <div class="flex items-center gap-1">
                <span class="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-amber-500"></span>
                <span class="text-[10px] sm:text-[11px] font-bold">Wilayah</span>
              </div>
              <input type="checkbox" v-model="layerVisibility.wilayah" class="toggle toggle-xs toggle-primary" />
            </label>

            <!-- CCTV Toggle -->
            <label class="cursor-pointer label p-1.5 sm:p-2 rounded-lg bg-base-200/60 border border-base-200 flex flex-col items-center gap-1 hover:bg-base-200 transition">
              <div class="flex items-center gap-1">
                <span class="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-cyan-500"></span>
                <span class="text-[10px] sm:text-[11px] font-bold">CCTV</span>
              </div>
              <input type="checkbox" v-model="layerVisibility.cctv" class="toggle toggle-xs toggle-info" />
            </label>

            <!-- Pengurus Toggle -->
            <label class="cursor-pointer label p-1.5 sm:p-2 rounded-lg bg-base-200/60 border border-base-200 flex flex-col items-center gap-1 hover:bg-base-200 transition">
              <div class="flex items-center gap-1">
                <span class="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-indigo-500"></span>
                <span class="text-[10px] sm:text-[11px] font-bold">Pengurus</span>
              </div>
              <input type="checkbox" v-model="layerVisibility.pengurus" class="toggle toggle-xs toggle-secondary" />
            </label>
          </div>
        </div>

        <!-- Search Bar -->
        <div class="p-2.5 sm:p-3 border-b border-base-200">
          <div class="relative">
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="Cari RT, CCTV, atau Pengurus..." 
              class="input input-xs sm:input-sm input-bordered w-full pr-8 text-xs"
            />
            <button 
              v-if="searchQuery" 
              @click="searchQuery = ''" 
              class="absolute right-2.5 top-1.5 sm:top-2 text-base-content/40 hover:text-base-content text-xs"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- Category Tabs -->
        <div class="tabs tabs-bordered grid grid-cols-4 text-[11px] sm:text-xs font-semibold px-2 bg-base-200/30">
          <button 
            class="tab tab-xs sm:tab-sm py-2 sm:py-3 h-auto" 
            :class="{ 'tab-active font-bold text-primary': activeTab === 'all' }"
            @click="activeTab = 'all'"
          >
            Semua
          </button>
          <button 
            class="tab tab-xs sm:tab-sm py-2 sm:py-3 h-auto" 
            :class="{ 'tab-active font-bold text-primary': activeTab === 'wilayah' }"
            @click="activeTab = 'wilayah'"
          >
            Wilayah
          </button>
          <button 
            class="tab tab-xs sm:tab-sm py-2 sm:py-3 h-auto" 
            :class="{ 'tab-active font-bold text-primary': activeTab === 'cctv' }"
            @click="activeTab = 'cctv'"
          >
            CCTV
          </button>
          <button 
            class="tab tab-xs sm:tab-sm py-2 sm:py-3 h-auto" 
            :class="{ 'tab-active font-bold text-primary': activeTab === 'pengurus' }"
            @click="activeTab = 'pengurus'"
          >
            Pengurus
          </button>
        </div>

        <!-- Items List -->
        <div class="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-1.5 sm:space-y-2 max-h-[45vh] sm:max-h-96">
          <div v-if="filteredItems.length === 0" class="text-center py-6 text-base-content/50 text-xs">
            Tidak ditemukan data yang sesuai filter
          </div>

          <div 
            v-for="item in filteredItems" 
            :key="item.id"
            class="p-2 sm:p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between hover:bg-base-200 group"
            :class="selectedItemId === item.id ? 'border-primary bg-primary/10' : 'border-base-200 bg-base-100'"
            @click="focusItem(item)"
          >
            <div class="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <!-- Icon by category -->
              <div 
                class="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm"
                :class="{
                  'bg-amber-500': item.category === 'wilayah',
                  'bg-cyan-600': item.category === 'cctv',
                  'bg-indigo-600': item.category === 'pengurus'
                }"
              >
                <!-- Wilayah Icon -->
                <svg v-if="item.category === 'wilayah'" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <!-- CCTV Icon -->
                <svg v-else-if="item.category === 'cctv'" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <!-- Pengurus Icon -->
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>

              <!-- Title & Subtitle -->
              <div class="truncate">
                <div class="font-semibold text-xs text-base-content truncate">
                  {{ item.title }}
                </div>
                <div class="text-[10px] sm:text-[11px] text-base-content/60 truncate">
                  {{ item.subtitle }}
                </div>
              </div>
            </div>

            <!-- Badge & Action -->
            <div class="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-2">
              <span class="badge badge-xs" :class="item.badgeClass">
                {{ item.badge }}
              </span>
              <button class="btn btn-xs btn-ghost btn-circle opacity-60 group-hover:opacity-100" title="Fokus di Peta">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Panel Footer -->
        <div class="p-2.5 sm:p-3 border-t border-base-200 bg-base-200/50 flex items-center justify-between text-[10px] sm:text-[11px] text-base-content/60">
          <span>RW 03 Digital GIS</span>
          <span>{{ filteredItems.length }} entitas</span>
        </div>
      </aside>
    </transition>

    <!-- Disclaimer / Dummy Data Notification Alert -->
    <transition name="toast-fade">
      <div 
        v-if="showDisclaimerAlert" 
        class="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-[calc(100%-2rem)] max-w-md pointer-events-auto"
      >
        <div class="alert alert-warning shadow-2xl border border-warning/30 bg-warning/90 backdrop-blur-md text-warning-content py-2.5 px-3.5 flex items-center justify-between gap-2.5 rounded-xl">
          <div class="flex items-center gap-2.5 min-w-0">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div class="text-xs leading-tight font-medium">
              <span class="font-bold block sm:inline">Pemberitahuan:</span>
              Data pada peta ini merupakan data simulasi / dummy (tidak real).
            </div>
          </div>
          <button 
            @click="showDisclaimerAlert = false" 
            class="btn btn-xs btn-circle btn-ghost shrink-0 hover:bg-black/10" 
            title="Tutup Notifikasi"
          >
            ✕
          </button>
        </div>
      </div>
    </transition>

    <!-- Full Map Canvas Element -->
    <div ref="mapContainer" class="w-full h-full z-0"></div>
  </div>
</template>

<style>
.leaflet-container {
  width: 100%;
  height: 100%;
  z-index: 1;
  font-family: inherit;
}

/* Leaflet Popup Theme & Dark Mode Integration */
.leaflet-popup-content-wrapper {
  background-color: var(--color-base-100, #1d232a) !important;
  color: var(--color-base-content, #a6adbb) !important;
  border-radius: var(--rounded-box, 0.75rem) !important;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3) !important;
  border: 1px solid var(--color-base-300, rgba(255, 255, 255, 0.12)) !important;
  padding: 0 !important;
  overflow: hidden !important;
}

.leaflet-popup-content {
  margin: 0 !important;
  line-height: inherit !important;
  color: inherit !important;
}

.leaflet-popup-tip {
  background-color: var(--color-base-100, #1d232a) !important;
  border: 1px solid var(--color-base-300, rgba(255, 255, 255, 0.12)) !important;
  box-shadow: none !important;
}

.leaflet-popup-close-button {
  top: 8px !important;
  right: 8px !important;
  width: 22px !important;
  height: 22px !important;
  padding: 0 !important;
  color: var(--color-base-content, #a6adbb) !important;
  opacity: 0.6 !important;
  transition: all 0.15s ease !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: 9999px !important;
  text-decoration: none !important;
  font-size: 15px !important;
  font-weight: bold !important;
}

.leaflet-popup-close-button:hover {
  opacity: 1 !important;
  color: var(--color-base-content, #ffffff) !important;
  background-color: var(--color-base-200, rgba(255, 255, 255, 0.15)) !important;
}

/* Custom styling for RT polygon label tooltips */
.rt-map-label {
  background: rgba(15, 23, 42, 0.85) !important;
  color: #ffffff !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  border-radius: 6px !important;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2) !important;
  padding: 2px 6px !important;
}

.rt-map-label::before {
  border-top-color: rgba(15, 23, 42, 0.85) !important;
}

/* Custom Marker Styling */
.custom-map-icon {
  background: transparent !important;
  border: none !important;
}

/* Transition for slide drawer */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.25s ease-out;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateY(-8px);
  opacity: 0;
}

@media (min-width: 640px) {
  .slide-enter-from,
  .slide-leave-to {
    transform: translateX(20px);
    opacity: 0;
  }
}

/* Transition for toast alert */
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s ease-out;
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  transform: translate(-50%, 20px);
  opacity: 0;
}
</style>
