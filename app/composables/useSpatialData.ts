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

export interface SpatialDataResponse {
  wilayah: GeoJsonFeatureCollection<WilayahProperties>
  cctv: GeoJsonFeatureCollection<CctvProperties>
  pengurus: GeoJsonFeatureCollection<PengurusProperties>
}

export const useRw3SpatialData = () => {
  const config = useRuntimeConfig()
  const endpoints = (config.public?.dataEndpoints as Record<string, string>) || {
    wilayah: 'https://s3.strbagus.com/rw3-timuran/wilayah.json',
    cctv: 'https://s3.strbagus.com/rw3-timuran/cctv.json',
    pengurus: 'https://s3.strbagus.com/rw3-timuran/pengurus.json'
  }

  return useAsyncData<SpatialDataResponse>('rw3-spatial-data', async () => {
    const [wilayah, cctv, pengurus] = await Promise.all([
      $fetch<GeoJsonFeatureCollection<WilayahProperties>>(endpoints.wilayah),
      $fetch<GeoJsonFeatureCollection<CctvProperties>>(endpoints.cctv),
      $fetch<GeoJsonFeatureCollection<PengurusProperties>>(endpoints.pengurus)
    ])

    return {
      wilayah,
      cctv,
      pengurus
    }
  }, {
    default: () => ({
      wilayah: { type: 'FeatureCollection', features: [] },
      cctv: { type: 'FeatureCollection', features: [] },
      pengurus: { type: 'FeatureCollection', features: [] }
    })
  })
}
