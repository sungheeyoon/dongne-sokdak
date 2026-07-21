function waitForKakaoMaps(): Promise<boolean> {
    return new Promise((resolve) => {
        if (typeof window !== 'undefined' &&
            window.kakao &&
            window.kakao.maps &&
            window.kakao.maps.LatLng) {
            resolve(true)
            return
        }

        let scriptLoadAttempts = 0
        const maxScriptAttempts = 100 // 10초

        const waitForScript = () => {
            scriptLoadAttempts++

            const scriptExists = document.querySelector('script[src*="dapi.kakao.com"]')
            if (!scriptExists) {
                if (scriptLoadAttempts >= maxScriptAttempts) {
                    console.error('❌ 카카오맵 스크립트 로드 실패')
                    resolve(false)
                    return
                }
                setTimeout(waitForScript, 100)
                return
            }

            waitForKakaoObjects()
        }

        const waitForKakaoObjects = () => {
            let attempts = 0
            const maxAttempts = 200 // 20초 (100ms * 200)

            const checkKakaoScript = () => {
                attempts++

                try {
                    if (typeof window !== 'undefined') {
                        if (!window.kakao) {
                            if (attempts >= maxAttempts) {
                                console.error('❌ window.kakao 로드 타임아웃')
                                resolve(false)
                                return
                            }
                            setTimeout(checkKakaoScript, 100)
                            return
                        }

                        if (!window.kakao.maps) {
                            const kakaoGlobal = window.kakao as unknown as { load?: (cb: () => void) => void }
                            if (typeof kakaoGlobal.load === 'function') {
                                try {
                                    kakaoGlobal.load(() => {
                                        setTimeout(checkKakaoScript, 100)
                                    })
                                } catch (loadError) {
                                    console.error('❌ 카카오맵 로드 함수 호출 실패:', loadError)
                                    setTimeout(checkKakaoScript, 100)
                                }
                                return
                            }

                            if (attempts >= maxAttempts) {
                                console.error('❌ window.kakao.maps 로드 타임아웃')
                                resolve(false)
                                return
                            }
                            setTimeout(checkKakaoScript, 100)
                            return
                        }

                        const hasRequiredAPIs = !!(
                            window.kakao.maps.LatLng &&
                            window.kakao.maps.Map &&
                            window.kakao.maps.Marker &&
                            window.kakao.maps.InfoWindow &&
                            window.kakao.maps.services &&
                            window.kakao.maps.services.Geocoder
                        )

                        if (hasRequiredAPIs) {
                            resolve(true)
                            return
                        }
                    }
                } catch (error) {
                    console.error('❌ 카카오맵 체크 중 오류:', error)
                }

                if (attempts >= maxAttempts) {
                    console.error('❌ 카카오맵 API 로드 타임아웃 (시도:', attempts, ')')
                    console.error('📊 최종 상태:', {
                        windowExists: typeof window !== 'undefined',
                        scriptExists: typeof window !== 'undefined' && !!document.querySelector('script[src*="dapi.kakao.com"]'),
                        kakaoExists: typeof window !== 'undefined' && !!window.kakao,
                        mapsExists: typeof window !== 'undefined' && !!window.kakao?.maps,
                        latLngExists: typeof window !== 'undefined' && !!window.kakao?.maps?.LatLng,
                        apiKey: process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY?.substring(0, 8) + '...',
                        currentURL: window.location.href,
                    })
                    resolve(false)
                    return
                }

                setTimeout(checkKakaoScript, 100)
            }

            checkKakaoScript()
        }

        waitForScript()
    })
}

export class KakaoMapAdapter {
    async ready(): Promise<boolean> {
        return waitForKakaoMaps()
    }

    panTo(map: any, lat: number, lng: number): void {
        map.panTo(new window.kakao.maps.LatLng(lat, lng))
    }

    setCenter(map: any, lat: number, lng: number): void {
        map.setCenter(new window.kakao.maps.LatLng(lat, lng))
    }

    setLevel(map: any, level: number, options?: { animate?: { duration: number } }): void {
        map.setLevel(level, options)
    }

    setBounds(map: any, bounds: any): void {
        map.setBounds(bounds)
    }

    getBounds(map: any): { north: number; south: number; east: number; west: number } | null {
        const bounds = map.getBounds()
        if (!bounds) return null

        const sw = bounds.getSouthWest()
        const ne = bounds.getNorthEast()
        return {
            south: sw.getLat(),
            west: sw.getLng(),
            north: ne.getLat(),
            east: ne.getLng(),
        }
    }

    getCenter(map: any): { lat: number; lng: number } {
        const center = map.getCenter()
        return { lat: center.getLat(), lng: center.getLng() }
    }

    getLevel(map: any): number {
        return map.getLevel()
    }

    addListener(map: any, event: string, handler: (...args: any[]) => void): void {
        window.kakao.maps.event.addListener(map, event, handler)
    }

    removeListener(map: any, event: string, handler: (...args: any[]) => void): void {
        window.kakao.maps.event.removeListener(map, event, handler)
    }
}

export const defaultKakaoMapAdapter = new KakaoMapAdapter()
