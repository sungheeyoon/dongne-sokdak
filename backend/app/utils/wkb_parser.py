"""
PostGIS WKB (Well-Known Binary) 파싱 유틸리티
"""
import struct

def parse_wkb_point(wkb_hex: str) -> tuple[float, float] | None:
    """
    PostGIS WKB POINT 데이터를 파싱하여 (lng, lat) 튜플 반환
    
    Args:
        wkb_hex: PostGIS WKB 16진수 문자열
        
    Returns:
        (lng, lat) 튜플 또는 None (파싱 실패시)
    """
    try:
        # 16진수 문자열을 바이트로 변환
        wkb_bytes = bytes.fromhex(wkb_hex)
        
        # WKB 헤더 확인 (최소 21바이트 필요)
        if len(wkb_bytes) < 21:
            return None
            
        # 바이트 순서 확인 (첫 번째 바이트)
        byte_order = wkb_bytes[0]
        endian = '<' if byte_order == 1 else '>'
        
        # 지오메트리 타입 확인 (바이트 1-4)
        geom_type = struct.unpack(f'{endian}I', wkb_bytes[1:5])[0]
        
        # POINT 타입인지 확인 (0x20000001 = SRID 포함 POINT)
        if geom_type != 0x20000001:
            return None
            
        # SRID 건너뛰기 (바이트 5-8)
        # 좌표 데이터 추출 (바이트 9-24: X좌표 8바이트 + Y좌표 8바이트)
        x = struct.unpack(f'{endian}d', wkb_bytes[9:17])[0]   # 경도
        y = struct.unpack(f'{endian}d', wkb_bytes[17:25])[0]  # 위도
        
        return (x, y)  # (lng, lat)
        
    except Exception as e:
        print(f"WKB parsing error: {e}")
        return None

def convert_wkb_to_location(wkb_data: str) -> dict:
    """
    WKB 데이터를 location 딕셔너리로 변환
    
    Args:
        wkb_data: PostGIS WKB 문자열
        
    Returns:
        {"lat": float, "lng": float} 또는 기본값
    """
    coords = parse_wkb_point(wkb_data)
    
    if coords:
        lng, lat = coords
        return {"lat": lat, "lng": lng}
    else:
        # 파싱 실패시 서울시청 기본 좌표
        return {"lat": 37.5665, "lng": 126.9780}

# 테스트 함수
def test_wkb_parsing():
    """WKB 파싱 테스트"""
    # 실제 데이터베이스에서 가져온 WKB 샘플
    test_wkb = "0101000020E61000003BDF4F8D97BE5F408D976E1283C84240"
    
    print("Testing WKB parsing:")
    print(f"Input WKB: {test_wkb}")
    
    coords = parse_wkb_point(test_wkb)
    print(f"Parsed coordinates: {coords}")
    
    location = convert_wkb_to_location(test_wkb)
    print(f"Location dict: {location}")

if __name__ == "__main__":
    test_wkb_parsing()
