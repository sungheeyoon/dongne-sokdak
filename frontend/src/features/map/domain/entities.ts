export interface MapBounds {
    north: number;
    south: number;
    east: number;
    west: number;
}

export interface Coordinates {
    lat: number;
    lng: number;
}

export interface Location extends Coordinates {
    address?: string; // Administrative address (e.g., 역삼동)
    placeName?: string; // Specific POI name if applicable
}

export interface PlaceSearchResult {
    id: string;
    placeName: string;
    address: string;
    roadAddress?: string;
    location: Coordinates;
    categoryName?: string;
    distance?: number;
}
