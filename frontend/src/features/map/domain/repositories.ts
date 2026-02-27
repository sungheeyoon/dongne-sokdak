import { Coordinates, PlaceSearchResult } from './entities';

export interface LocationRepository {
    /**
     * Search for places based on a keyword query.
     * Optionally constrained by current map bounds or location.
     */
    searchPlaces(query: string, options?: {
        location?: Coordinates;
        radius?: number; // in meters
    }): Promise<PlaceSearchResult[]>;

    /**
     * Converts coordinates into a human-readable administrative address.
     * e.g. "강남구 역삼동"
     */
    reverseGeocode(coords: Coordinates): Promise<string>;
}
