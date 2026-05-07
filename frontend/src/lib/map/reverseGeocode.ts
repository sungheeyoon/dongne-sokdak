export async function reverseGeocode(lat: number, lng: number): Promise<string> {
    return new Promise((resolve) => {
        if (typeof window === 'undefined' || !(window as any).kakao?.maps) {
            if (process.env.NODE_ENV === 'development') {
                if (process.env.NODE_ENV === 'development') console.log('📍 reverseGeocode: 카카오맵 없어서 기본 위치명 설정');
            }
            return resolve('선택한 위치');
        }

        const geocoder = new (window as any).kakao.maps.services.Geocoder();
        geocoder.coord2Address(lng, lat, (result: any[], status: any) => {
            if (status !== (window as any).kakao.maps.services.Status.OK) {
                if (process.env.NODE_ENV === 'development') {
                    if (process.env.NODE_ENV === 'development') console.log('📍 reverseGeocode: 기본 위치명 설정');
                }
                resolve('선택한 위치');
                return;
            }

            const addr = result[0];
            let locationName = '';

            if (addr.road_address) {
                const roadName = addr.road_address.road_name;
                const buildingName = addr.road_address.building_name;

                if (buildingName) {
                    locationName = buildingName;
                } else if (roadName) {
                    locationName = `${roadName} 일대`;
                } else {
                    locationName = addr.road_address.address_name.split(' ').slice(-2).join(' ');
                }
            } else if (addr.address) {
                const addressParts = addr.address.address_name.split(' ');
                locationName = addressParts.slice(-2).join(' ');
            }

            resolve(locationName || '선택한 위치');
        });
    });
}
