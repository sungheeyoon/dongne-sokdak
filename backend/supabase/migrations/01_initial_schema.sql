-- 🧑‍💼 프로필 테이블
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    nickname TEXT NOT NULL,
    avatar_url TEXT,
    location GEOGRAPHY(POINT),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "사용자는 자신의 프로필을 볼 수 있음" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "사용자는 자신의 프로필을 생성할 수 있음" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "사용자는 자신의 프로필을 업데이트할 수 있음" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- 📢 제보 테이블
CREATE TYPE report_status AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');
CREATE TYPE report_category AS ENUM ('NOISE', 'TRASH', 'FACILITY', 'TRAFFIC', 'OTHER');

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT,
    location GEOGRAPHY(POINT) NOT NULL,
    address TEXT,
    category report_category NOT NULL DEFAULT 'OTHER',
    status report_status NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX reports_location_idx ON reports USING GIST (location);
CREATE INDEX reports_user_id_idx ON reports (user_id);
CREATE INDEX reports_status_idx ON reports (status);
CREATE INDEX reports_category_idx ON reports (category);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "누구나 제보를 볼 수 있음" ON reports
    FOR SELECT USING (true);

CREATE POLICY "인증된 사용자는 제보를 생성할 수 있음" ON reports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "작성자만 제보를 수정할 수 있음" ON reports
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "작성자만 제보를 삭제할 수 있음" ON reports
    FOR DELETE USING (auth.uid() = user_id);

-- 💬 댓글 테이블
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX comments_report_id_idx ON comments (report_id);
CREATE INDEX comments_user_id_idx ON comments (user_id);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "누구나 댓글을 볼 수 있음" ON comments
    FOR SELECT USING (true);

CREATE POLICY "인증된 사용자는 댓글을 생성할 수 있음" ON comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "작성자만 댓글을 수정할 수 있음" ON comments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "작성자만 댓글을 삭제할 수 있음" ON comments
    FOR DELETE USING (auth.uid() = user_id);

-- ❤️ 공감 테이블
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (report_id, user_id)
);

CREATE INDEX votes_report_id_idx ON votes (report_id);
CREATE INDEX votes_user_id_idx ON votes (user_id);

ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "누구나 공감 수를 볼 수 있음" ON votes
    FOR SELECT USING (true);

CREATE POLICY "인증된 사용자는 공감을 할 수 있음" ON votes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "사용자는 자신의 공감을 삭제할 수 있음" ON votes
    FOR DELETE USING (auth.uid() = user_id);

-- 🧭 반경 내 제보를 가져오는 함수 추가
CREATE OR REPLACE FUNCTION reports_within_radius(
    lat float, lng float, radius_meters float,
    p_category text DEFAULT NULL, p_status text DEFAULT NULL,
    p_skip int DEFAULT 0, p_limit int DEFAULT 100
)
RETURNS TABLE (
    id uuid, user_id uuid, title text, description text,
    image_url text, location geography, address text,
    category text, status text, 
    created_at timestamptz, updated_at timestamptz,
    vote_count bigint, comment_count bigint
) AS $$
BEGIN
    -- 위치 파라미터가 모두 제공된 경우만 위치 기반 필터링
    IF lat IS NOT NULL AND lng IS NOT NULL AND radius_meters IS NOT NULL THEN
        RETURN QUERY
        SELECT r.*, 
            (SELECT COUNT(*) FROM votes v WHERE v.report_id = r.id) AS vote_count,
            (SELECT COUNT(*) FROM comments c WHERE c.report_id = r.id) AS comment_count
        FROM reports r
        WHERE ST_DWithin(
                r.location, 
                ST_SetSRID(ST_MakePoint(lng, lat), 4326),
                radius_meters
            )
            AND (p_category IS NULL OR r.category = p_category)
            AND (p_status IS NULL OR r.status = p_status)
        ORDER BY r.created_at DESC
        LIMIT p_limit OFFSET p_skip;
    ELSE
        -- 위치 정보 없으면 모든 제보 반환 (다른 필터만 적용)
        RETURN QUERY
        SELECT r.*, 
            (SELECT COUNT(*) FROM votes v WHERE v.report_id = r.id) AS vote_count,
            (SELECT COUNT(*) FROM comments c WHERE c.report_id = r.id) AS comment_count
        FROM reports r
        WHERE (p_category IS NULL OR r.category = p_category)
            AND (p_status IS NULL OR r.status = p_status)
        ORDER BY r.created_at DESC
        LIMIT p_limit OFFSET p_skip;
    END IF;
END;
$$ LANGUAGE plpgsql;
