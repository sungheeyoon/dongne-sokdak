-- 사용자 역할 기반 접근 제어 (RBAC) 시스템 추가

-- 사용자 역할 ENUM 타입 생성
CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin');

-- profiles 테이블에 role 컬럼 추가
ALTER TABLE profiles 
ADD COLUMN role user_role DEFAULT 'user' NOT NULL,
ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN login_count INTEGER DEFAULT 0 NOT NULL;

-- 역할별 인덱스 추가
CREATE INDEX profiles_role_idx ON profiles (role);
CREATE INDEX profiles_is_active_idx ON profiles (is_active);
CREATE INDEX profiles_last_login_idx ON profiles (last_login_at);

-- 관리자 권한 확인을 위한 함수 생성
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = user_id 
        AND role IN ('admin', 'moderator')
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 관리자 전용 정책 생성 (관리자만 다른 사용자 정보 수정 가능)
CREATE POLICY "관리자는 모든 프로필을 수정할 수 있음" ON profiles
    FOR UPDATE USING (
        auth.uid() = id OR  -- 본인 수정
        is_admin(auth.uid()) -- 관리자 권한
    );

-- 관리자 활동 로그 테이블 생성
CREATE TABLE admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES profiles(id) NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT, -- 'user', 'report', 'comment' 등
    target_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 관리자 활동 로그 인덱스
CREATE INDEX admin_activity_logs_admin_id_idx ON admin_activity_logs (admin_id);
CREATE INDEX admin_activity_logs_action_idx ON admin_activity_logs (action);
CREATE INDEX admin_activity_logs_target_idx ON admin_activity_logs (target_type, target_id);
CREATE INDEX admin_activity_logs_created_at_idx ON admin_activity_logs (created_at);

-- 관리자 활동 로그 RLS 정책
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "관리자만 활동 로그를 볼 수 있음" ON admin_activity_logs
    FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "관리자만 활동 로그를 생성할 수 있음" ON admin_activity_logs
    FOR INSERT WITH CHECK (is_admin(auth.uid()));

-- 시스템 통계를 위한 뷰 생성
CREATE VIEW admin_dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM profiles WHERE is_active = true) as active_users,
    (SELECT COUNT(*) FROM profiles WHERE role = 'admin') as admin_count,
    (SELECT COUNT(*) FROM profiles WHERE role = 'moderator') as moderator_count,
    (SELECT COUNT(*) FROM reports WHERE status = 'OPEN') as open_reports,
    (SELECT COUNT(*) FROM reports WHERE status = 'RESOLVED') as resolved_reports,
    (SELECT COUNT(*) FROM reports WHERE created_at >= CURRENT_DATE) as today_reports,
    (SELECT COUNT(*) FROM comments WHERE created_at >= CURRENT_DATE) as today_comments,
    (SELECT COUNT(*) FROM votes WHERE created_at >= CURRENT_DATE) as today_votes;

-- 관리자만 통계 뷰에 접근 가능
ALTER TABLE admin_dashboard_stats OWNER TO postgres;

-- 기본 관리자 계정을 위한 함수 (첫 번째 사용자를 관리자로 설정)
CREATE OR REPLACE FUNCTION set_first_user_as_admin()
RETURNS trigger AS $$
BEGIN
    -- profiles 테이블의 첫 번째 사용자를 자동으로 관리자로 설정
    IF (SELECT COUNT(*) FROM profiles) = 1 THEN
        UPDATE profiles SET role = 'admin' WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 첫 번째 사용자 관리자 설정 트리거
CREATE TRIGGER set_first_user_admin_trigger
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION set_first_user_as_admin();

-- 컬럼에 대한 주석 추가
COMMENT ON COLUMN profiles.role IS '사용자 역할 (user: 일반사용자, moderator: 중간관리자, admin: 최고관리자)';
COMMENT ON COLUMN profiles.is_active IS '계정 활성화 상태 (관리자가 계정을 비활성화할 수 있음)';
COMMENT ON COLUMN profiles.last_login_at IS '마지막 로그인 시간';
COMMENT ON COLUMN profiles.login_count IS '총 로그인 횟수';
COMMENT ON TABLE admin_activity_logs IS '관리자 활동 로그 (감사 추적용)';
COMMENT ON VIEW admin_dashboard_stats IS '관리자 대시보드 통계 정보';