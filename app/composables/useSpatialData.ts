export interface WilayahProperties {
  rt: string
  rw: string
  name: string
  color?: string
  [key: string]: any
}

export interface CctvProperties {
  id: string
  name: string
  category?: string
  rt?: string
  resolution?: string
  status?: string
  ip?: string
  description?: string
  [key: string]: any
}

export interface PengurusProperties {
  id: string
  name: string
  jabatan: string
  rt: string
  rw: string
  address: string
  phone?: string
  periode?: string
  [key: string]: any
}

export interface GeoJsonGeometry {
  type: string
  coordinates: any
}

export interface GeoJsonFeature<P = any> {
  type: 'Feature'
  properties: P
  geometry: GeoJsonGeometry
}

export interface GeoJsonFeatureCollection<P = any> {
  type: 'FeatureCollection'
  features: GeoJsonFeature<P>[]
}

export interface LayerSettings {
  wilayah: boolean
  cctv: boolean
  pengurus: boolean
}

export interface SpatialDataResponse {
  layers: LayerSettings
  wilayah: GeoJsonFeatureCollection<WilayahProperties>
  cctv: GeoJsonFeatureCollection<CctvProperties>
  pengurus: GeoJsonFeatureCollection<PengurusProperties>
}

export const useRw3SpatialData = () => {
  const config = useRuntimeConfig()
  const endpoints = (config.public?.dataEndpoints as Record<string, string>) || {
    layers: '/layers.json',
    wilayah: 'https://s3.strbagus.com/rw3-timuran/wilayah.json',
    cctv: 'https://s3.strbagus.com/rw3-timuran/cctv.json',
    pengurus: 'https://s3.strbagus.com/rw3-timuran/pengurus.json'
  }

  return useAsyncData<SpatialDataResponse>('rw3-spatial-data', async () => {
    // 1. Fetch layer category visibility settings from JSON
    const layers = await $fetch<LayerSettings>(endpoints.layers || '/layers.json').catch(() => ({
      wilayah: true,
      cctv: true,
      pengurus: true
    }))

    const layerFlags: LayerSettings = {
      wilayah: layers.wilayah !== false,
      cctv: layers.cctv !== false,
      pengurus: layers.pengurus !== false
    }

    // 2. Fetch GeoJSON datasets conditionally only for enabled layers
    const [wilayah, cctv, pengurus] = await Promise.all([
      layerFlags.wilayah
        ? $fetch<GeoJsonFeatureCollection<WilayahProperties>>(endpoints.wilayah).catch(() => ({ type: 'FeatureCollection' as const, features: [] }))
        : Promise.resolve({ type: 'FeatureCollection' as const, features: [] }),
      layerFlags.cctv
        ? $fetch<GeoJsonFeatureCollection<CctvProperties>>(endpoints.cctv).catch(() => ({ type: 'FeatureCollection' as const, features: [] }))
        : Promise.resolve({ type: 'FeatureCollection' as const, features: [] }),
      layerFlags.pengurus
        ? $fetch<GeoJsonFeatureCollection<PengurusProperties>>(endpoints.pengurus).catch(() => ({ type: 'FeatureCollection' as const, features: [] }))
        : Promise.resolve({ type: 'FeatureCollection' as const, features: [] })
    ])

    return {
      layers: layerFlags,
      wilayah,
      cctv,
      pengurus
    }
  }, {
    default: () => ({
      layers: { wilayah: true, cctv: true, pengurus: true },
      wilayah: { type: 'FeatureCollection', features: [] },
      cctv: { type: 'FeatureCollection', features: [] },
      pengurus: { type: 'FeatureCollection', features: [] }
    })
  })
}
