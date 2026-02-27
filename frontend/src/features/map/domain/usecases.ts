import { LocationRepository } from './repositories';
import { Coordinates } from './entities';

export class LocationUseCases {
    constructor(private locationRepository: LocationRepository) { }

    async searchPlaces(query: string, locationContext?: Coordinates): Promise<any[]> {
        if (!query || query.trim().length === 0) {
            return [];
        }

        // Provide location context to prioritize nearby results if locationContext is provided
        return this.locationRepository.searchPlaces(query, locationContext ? { location: locationContext, radius: 5000 } : undefined);
    }

    async getAddressFromCoordinates(coords: Coordinates): Promise<string> {
        if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
            throw new Error("Invalid coordinates provided.");
        }

        return this.locationRepository.reverseGeocode(coords);
    }
}
