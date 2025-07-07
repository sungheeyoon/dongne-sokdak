// Kakao Maps API 타입 선언
declare global {
  interface Window {
    kakao: {
      maps: {
        Map: new (container: HTMLElement, options: any) => any
        LatLng: new (lat: number, lng: number) => any
        Size: new (width: number, height: number) => any
        Point: new (x: number, y: number) => any
        MarkerImage: new (src: string, size: any, options?: any) => any
        Marker: new (options: any) => any
        InfoWindow: new (options: any) => any
        Circle: new (options: any) => any
        services: {
          Status: {
            OK: string
            ZERO_RESULT: string
            ERROR: string
          }
          SortBy: {
            ACCURACY: string
            DISTANCE: string
          }
          Places: new () => any
          Geocoder: new () => any
        }
        event: {
          addListener: (target: any, type: string, handler: Function) => void
          removeListener: (target: any, type: string, handler: Function) => void
        }
        drawing: {
          OverlayType: {
            MARKER: string
            POLYLINE: string
            RECTANGLE: string
            CIRCLE: string
            POLYGON: string
          }
        }
      }
    }
  }
}

export {}