-- 소셜 로그인 지원을 위한 컬럼 추가
ALTER TABLE profiles 
ADD COLUMN email TEXT,
ADD COLUMN kakao_id TEXT UNIQUE,
ADD COLUMN social_provider TEXT DEFAULT 'email';

-- 기존 인덱스 추가
CREATE INDEX profiles_email_idx ON profiles (email);
CREATE INDEX profiles_kakao_id_idx ON profiles (kakao_id);
CREATE INDEX profiles_social_provider_idx ON profiles (social_provider);

-- 소셜 로그인 사용자를 위한 정책 업데이트
-- 카카오 로그인 사용자는 auth.users 테이블을 사용하지 않으므로 별도 처리

-- 기존 정책 삭제 후 재생성
DROP POLICY IF EXISTS "사용자는 자신의 프로필을 생성할 수 있음" ON profiles;
DROP POLICY IF EXISTS "사용자는 자신의 프로필을 업데이트할 수 있음" ON profiles;

-- 새로운 정책 생성 (소셜 로그인 지원)
CREATE POLICY "사용자는 자신의 프로필을 생성할 수 있음" ON profiles
    FOR INSERT WITH CHECK (
        auth.uid() = id OR  -- 기존 Supabase Auth 사용자
        id IS NOT NULL      -- 소셜 로그인 사용자 (별도 UUID)
    );

CREATE POLICY "사용자는 자신의 프로필을 업데이트할 수 있음" ON profiles
    FOR UPDATE USING (
        auth.uid() = id OR  -- 기존 Supabase Auth 사용자
        id IS NOT NULL      -- 소셜 로그인 사용자 (JWT 토큰으로 검증)
    );

-- 소셜 로그인 지원을 위한 함수 추가 (필요시)
COMMENT ON COLUMN profiles.kakao_id IS '카카오 소셜 로그인 사용자 ID';
COMMENT ON COLUMN profiles.social_provider IS '소셜 로그인 제공자 (email, kakao, google 등)';
COMMENT ON COLUMN profiles.email IS '사용자 이메일 (소셜 로그인 포함)';