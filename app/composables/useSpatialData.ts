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
  const requestFetch = useRequestFetch()
  const baseURL = config.app?.baseURL || '/'
  const endpoints = (config.public?.dataEndpoints as Record<string, string>) || {
    layers: '/json/layers.json',
    wilayah: '/json/wilayah.json',
    cctv: '/json/cctv.json',
    pengurus: '/json/pengurus.json'
  }

  const fetchEndpoint = <T>(url: string) => {
    const isExternal = /^https?:///.test(url)
    return requestFetch<T>(url, isExternal ? undefined : { baseURL })
  }

  return useAsyncData<SpatialDataResponse>('rw3-spatial-data', async () => {
    // 1. Fetch layer category visibility settings from JSON
    const layers = await fetchEndpoint<LayerSettings>(endpoints.layers || '/json/layers.json').catch(() => ({
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
        ? fetchEndpoint<GeoJsonFeatureCollection<WilayahProperties>>(endpoints.wilayah || '/json/wilayah.json').catch(() => ({ type: 'FeatureCollection' as const, features: [] }))
        : Promise.resolve({ type: 'FeatureCollection' as const, features: [] }),
      layerFlags.cctv
        ? fetchEndpoint<GeoJsonFeatureCollection<CctvProperties>>(endpoints.cctv || '/json/cctv.json').catch(() => ({ type: 'FeatureCollection' as const, features: [] }))
        : Promise.resolve({ type: 'FeatureCollection' as const, features: [] }),
      layerFlags.pengurus
        ? fetchEndpoint<GeoJsonFeatureCollection<PengurusProperties>>(endpoints.pengurus || '/json/pengurus.json').catch(() => ({ type: 'FeatureCollection' as const, features: [] }))
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
