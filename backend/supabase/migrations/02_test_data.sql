-- 테스트 사용자 데이터는 Supabase Auth UI를 통해 직접 생성하거나 Auth API를 통해 생성해야 합니다.
-- 여기서는 프로필 데이터와 테스트 제보 데이터만 추가합니다.

-- 테스트 프로필 데이터 (실제 사용자 ID로 대체 필요)
INSERT INTO profiles (id, nickname, avatar_url, location)
VALUES 
    ('e032b4ea-a36e-4a1e-9c53-5fe5c32e3089', '동네주민1', 'https://example.com/avatar1.jpg', ST_Point(126.9780, 37.5665)::geography),
    ('f09e2abb-514b-4e00-b4c7-0f1f9b10f480', '동네지킴이', 'https://example.com/avatar2.jpg', ST_Point(126.9770, 37.5675)::geography);

-- 테스트 제보 데이터
INSERT INTO reports (user_id, title, description, image_url, location, address, category, status)
VALUES 
    ('e032b4ea-a36e-4a1e-9c53-5fe5c32e3089', '인도 블록 깨짐', '횡단보도 앞 인도 블록이 깨져서 위험합니다.', 
     'https://example.com/broken_sidewalk.jpg', 
     ST_Point(126.9780, 37.5665)::geography, 
     '서울시 중구 세종대로', 'FACILITY', 'OPEN'),
    
    ('f09e2abb-514b-4e00-b4c7-0f1f9b10f480', '쓰레기 무단투기', '아파트 입구에 쓰레기가 계속 쌓이고 있습니다.', 
     'https://example.com/trash.jpg', 
     ST_Point(126.9770, 37.5675)::geography, 
     '서울시 중구 을지로', 'TRASH', 'IN_PROGRESS');

-- 테스트 댓글 데이터
INSERT INTO comments (report_id, user_id, content)
VALUES 
    ((SELECT id FROM reports WHERE title = '인도 블록 깨짐' LIMIT 1), 
     'f09e2abb-514b-4e00-b4c7-0f1f9b10f480', 
     '저도 어제 봤어요. 정말 위험해 보이더라고요.'),
    
    ((SELECT id FROM reports WHERE title = '쓰레기 무단투기' LIMIT 1), 
     'e032b4ea-a36e-4a1e-9c53-5fe5c32e3089', 
     '구청에 민원 넣었는데 처리 예정이라고 합니다.');

-- 테스트 공감 데이터
INSERT INTO votes (report_id, user_id)
VALUES 
    ((SELECT id FROM reports WHERE title = '인도 블록 깨짐' LIMIT 1), 'f09e2abb-514b-4e00-b4c7-0f1f9b10f480'),
    ((SELECT id FROM reports WHERE title = '쓰레기 무단투기' LIMIT 1), 'e032b4ea-a36e-4a1e-9c53-5fe5c32e3089');