-- 아바타 이미지를 위한 스토리지 버킷 생성
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- 아바타 업로드 정책 생성
CREATE POLICY "사용자는 자신의 아바타를 업로드할 수 있음" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- 아바타 읽기 정책 생성
CREATE POLICY "누구나 아바타를 볼 수 있음" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- 아바타 삭제 정책 생성
CREATE POLICY "사용자는 자신의 아바타를 삭제할 수 있음" ON storage.objects
FOR DELETE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- 아바타 업데이트 정책 생성
CREATE POLICY "사용자는 자신의 아바타를 업데이트할 수 있음" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
);
