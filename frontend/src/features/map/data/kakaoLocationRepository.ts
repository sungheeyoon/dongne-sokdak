import { LocationRepository } from '../domain/repositories';
import { Coordinates, PlaceSearchResult } from '../domain/entities';
import { waitForKakaoMaps } from '@/lib/map/kakaoMapUtils';
import { formatToAdministrativeAddress } from '@/lib/utils/addressUtils';

export class KakaoLocationRepository implements LocationRepository {
    async searchPlaces(query: string, options?: { location?: Coordinates; radius?: number }): Promise<PlaceSearchResult[]> {
        const isLoaded = await waitForKakaoMaps();
        if (!isLoaded) throw new Error("Kakao Maps API is not loaded.");

        return new Promise((resolve, reject) => {
            const places = new window.kakao.maps.services.Places();

            const searchOptions: any = {};
            if (options?.location) {
                searchOptions.location = new window.kakao.maps.LatLng(options.location.lat, options.location.lng);
            }
            if (options?.radius) {
                searchOptions.radius = options.radius;
            }

            places.keywordSearch(query, (result: any[], status: any) => {
                if (status === window.kakao.maps.services.Status.OK) {
                    const mappedResults: PlaceSearchResult[] = result.map((place) => ({
                        id: place.id,
                        placeName: place.place_name,
                        address: place.address_name,
                        roadAddress: place.road_address_name,
                        location: {
                            lat: parseFloat(place.y),
                            lng: parseFloat(place.x),
                        },
                        categoryName: place.category_name,
                        distance: place.distance ? parseInt(place.distance, 10) : undefined
                    }));
                    resolve(mappedResults);
                } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
                    resolve([]);
                } else {
                    reject(new Error(`Failed to search places. Status: ${status}`));
                }
            }, searchOptions);
        });
    }

    async reverseGeocode(coords: Coordinates): Promise<string> {
        const isLoaded = await waitForKakaoMaps();
        if (!isLoaded) throw new Error("Kakao Maps API is not loaded.");

        return new Promise((resolve, reject) => {
            const geocoder = new window.kakao.maps.services.Geocoder();

            geocoder.coord2Address(coords.lng, coords.lat, (result: any[], status: any) => {
                if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
                    const addr = result[0];
                    let address = '';

                    if (addr.address && addr.address.region_3depth_name) {
                        const gu = addr.address.region_2depth_name;
                        const dong = addr.address.region_3depth_name;
                        const guName = gu.includes('구') ? gu : `${gu}구`;
                        address = `${guName} ${dong}`;
                    } else {
                        const fullAddress = addr.road_address
                            ? addr.road_address.address_name
                            : addr.address.address_name;
                        address = formatToAdministrativeAddress(fullAddress);
                    }
                    resolve(address);
                } else {
                    reject(new Error(`Failed to reverse geocode coords. Status: ${status}`));
                }
            });
        });
    }
}

export const kakaoLocationRepository = new KakaoLocationRepository();
