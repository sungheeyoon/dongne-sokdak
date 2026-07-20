import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { KakaoMapAdapter } from '@/features/map/data/kakaoMapAdapter'

describe('KakaoMapAdapter', () => {
  beforeEach(() => {
    delete (window as any).kakao
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('ready', () => {
    it('resolves true when the Kakao Maps SDK is already loaded', async () => {
      window.kakao = {
        maps: {
          LatLng: class {},
        },
      } as any

      const adapter = new KakaoMapAdapter()

      await expect(adapter.ready()).resolves.toBe(true)
    })

    it('resolves false when the SDK script never appears', async () => {
      vi.useFakeTimers()
      const adapter = new KakaoMapAdapter()

      const result = adapter.ready()
      await vi.advanceTimersByTimeAsync(15000)

      await expect(result).resolves.toBe(false)
    })
  })

  describe('panTo', () => {
    it('pans the given map to the given coordinates', () => {
      window.kakao = {
        maps: {
          LatLng: class {
            constructor(public lat: number, public lng: number) { }
          },
        },
      } as any

      const map = { panTo: vi.fn() }
      const adapter = new KakaoMapAdapter()

      adapter.panTo(map, 37.5, 127.0)

      expect(map.panTo).toHaveBeenCalledTimes(1)
      const calledWith = map.panTo.mock.calls[0][0]
      expect(calledWith.lat).toBe(37.5)
      expect(calledWith.lng).toBe(127.0)
    })
  })

  describe('setCenter', () => {
    it('instantly recenters the given map to the given coordinates', () => {
      window.kakao = {
        maps: {
          LatLng: class {
            constructor(public lat: number, public lng: number) { }
          },
        },
      } as any

      const map = { setCenter: vi.fn() }
      const adapter = new KakaoMapAdapter()

      adapter.setCenter(map, 37.5, 127.0)

      expect(map.setCenter).toHaveBeenCalledTimes(1)
      const calledWith = map.setCenter.mock.calls[0][0]
      expect(calledWith.lat).toBe(37.5)
      expect(calledWith.lng).toBe(127.0)
    })
  })

  describe('setLevel', () => {
    it('sets the zoom level on the given map', () => {
      const map = { setLevel: vi.fn() }
      const adapter = new KakaoMapAdapter()

      adapter.setLevel(map, 3, { animate: { duration: 500 } })

      expect(map.setLevel).toHaveBeenCalledWith(3, { animate: { duration: 500 } })
    })
  })

  describe('getBounds', () => {
    it('returns the bounds of the given map as a plain rectangle', () => {
      const map = {
        getBounds: () => ({
          getSouthWest: () => ({ getLat: () => 37.4, getLng: () => 126.9 }),
          getNorthEast: () => ({ getLat: () => 37.6, getLng: () => 127.1 }),
        }),
      }
      const adapter = new KakaoMapAdapter()

      expect(adapter.getBounds(map)).toEqual({ south: 37.4, west: 126.9, north: 37.6, east: 127.1 })
    })

    it('returns null when the map has no bounds yet', () => {
      const map = { getBounds: () => null }
      const adapter = new KakaoMapAdapter()

      expect(adapter.getBounds(map)).toBeNull()
    })
  })

  describe('getCenter', () => {
    it('returns the center of the given map as a plain coordinate', () => {
      const map = { getCenter: () => ({ getLat: () => 37.5, getLng: () => 127.0 }) }
      const adapter = new KakaoMapAdapter()

      expect(adapter.getCenter(map)).toEqual({ lat: 37.5, lng: 127.0 })
    })
  })

  describe('getLevel', () => {
    it('returns the zoom level of the given map', () => {
      const map = { getLevel: () => 5 }
      const adapter = new KakaoMapAdapter()

      expect(adapter.getLevel(map)).toBe(5)
    })
  })

  describe('addListener / removeListener', () => {
    it('registers an event listener via the Kakao SDK', () => {
      const addListener = vi.fn()
      window.kakao = { maps: { event: { addListener, removeListener: vi.fn() } } } as any
      const map = {}
      const handler = () => { }
      const adapter = new KakaoMapAdapter()

      adapter.addListener(map, 'dragend', handler)

      expect(addListener).toHaveBeenCalledWith(map, 'dragend', handler)
    })

    it('removes an event listener via the Kakao SDK', () => {
      const removeListener = vi.fn()
      window.kakao = { maps: { event: { addListener: vi.fn(), removeListener } } } as any
      const map = {}
      const handler = () => { }
      const adapter = new KakaoMapAdapter()

      adapter.removeListener(map, 'dragend', handler)

      expect(removeListener).toHaveBeenCalledWith(map, 'dragend', handler)
    })
  })
})
