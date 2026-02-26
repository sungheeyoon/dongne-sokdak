-- profiles 테이블에 neighborhood JSONB 컬럼 추가
-- 이 컬럼을 통해 사용자가 설정한 "내 동네"의 장소명, 주소, 위경도 좌표를 저장합니다.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS neighborhood JSONB DEFAULT NULL;

-- 캐시 갱신 (PostgREST API 스키마 리로드)
NOTIFY pgrst, 'reload schema';
