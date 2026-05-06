-- get_profile_with_stats RPC
-- 특정 사용자의 프로필 정보와 통계(제보 수, 댓글 수, 투표 수)를 한 번에 조회합니다.

CREATE OR REPLACE FUNCTION get_profile_with_stats(target_user_id UUID)
RETURNS JSON AS $$
DECLARE
    profile_record RECORD;
    report_cnt INTEGER;
    comment_cnt INTEGER;
    vote_cnt INTEGER;
BEGIN
    -- 프로필 조회
    SELECT * INTO profile_record FROM profiles WHERE id = target_user_id;
    
    IF profile_record.id IS NULL THEN
        RETURN NULL;
    END IF;

    -- 통계 조회 (병렬성은 DB 엔진에 맡김)
    SELECT COUNT(*)::INTEGER INTO report_cnt FROM reports WHERE user_id = target_user_id;
    SELECT COUNT(*)::INTEGER INTO comment_cnt FROM comments WHERE user_id = target_user_id;
    SELECT COUNT(*)::INTEGER INTO vote_cnt FROM votes WHERE user_id = target_user_id;

    RETURN json_build_object(
        'id', profile_record.id,
        'nickname', profile_record.nickname,
        'avatar_url', profile_record.avatar_url,
        'role', profile_record.role,
        'is_active', profile_record.is_active,
        'neighborhood', profile_record.neighborhood,
        'created_at', profile_record.created_at,
        'updated_at', profile_record.updated_at,
        'last_login_at', profile_record.last_login_at,
        'stats', json_build_object(
            'report_count', report_cnt,
            'comment_count', comment_cnt,
            'vote_count', vote_cnt
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
