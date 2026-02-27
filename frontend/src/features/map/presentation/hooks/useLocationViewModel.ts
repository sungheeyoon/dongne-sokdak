import { useState, useCallback } from 'react';
import { LocationUseCases } from '../../domain/usecases';
import { kakaoLocationRepository } from '../../data/kakaoLocationRepository';
import { Coordinates, PlaceSearchResult } from '../../domain/entities';

const locationUseCases = new LocationUseCases(kakaoLocationRepository);

export function useLocationViewModel() {
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
    const [error, setError] = useState<string | null>(null);

    const searchPlaces = useCallback(async (query: string, locationContext?: Coordinates) => {
        if (!query || query.trim().length === 0) {
            setSearchResults([]);
            return [];
        }

        setIsSearching(true);
        setError(null);
        try {
            const results = await locationUseCases.searchPlaces(query, locationContext);
            setSearchResults(results);
            return results;
        } catch (err) {
            const msg = err instanceof Error ? err.message : '검색 중 오류가 발생했습니다.';
            setError(msg);
            setSearchResults([]);
            return [];
        } finally {
            setIsSearching(false);
        }
    }, []);

    const reverseGeocode = useCallback(async (coords: Coordinates): Promise<string> => {
        try {
            return await locationUseCases.getAddressFromCoordinates(coords);
        } catch (err) {
            console.error('Reverse geocode failed:', err);
            return '';
        }
    }, []);

    return {
        isSearching,
        searchResults,
        searchError: error,
        searchPlaces,
        reverseGeocode,
    };
}
