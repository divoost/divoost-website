-- =====================================================
-- DIVOOST SNS Platform - Storage Bucket Setup
-- =====================================================
-- Instagram, TikTok 등 외부 SNS API는 미디어 공개 URL이 필요합니다.
-- Supabase Storage를 사용하여 임시 호스팅합니다.
-- =====================================================

-- 1) 공개 버킷 생성 (또는 공개 여부 업데이트)
INSERT INTO storage.buckets (id, name, public)
VALUES ('sns-media', 'sns-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2) 인증된 사용자는 자기 폴더에 업로드 가능
DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
CREATE POLICY "Authenticated users can upload media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'sns-media');

-- 3) 본인이 업로드한 파일 업데이트 가능 (upsert용)
DROP POLICY IF EXISTS "Users can update own media" ON storage.objects;
CREATE POLICY "Users can update own media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'sns-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 4) 본인 파일 삭제 가능
DROP POLICY IF EXISTS "Users can delete own media" ON storage.objects;
CREATE POLICY "Users can delete own media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'sns-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 5) 누구나 미디어 조회 가능 (Instagram이 받아갈 수 있도록)
DROP POLICY IF EXISTS "Public can view media" ON storage.objects;
CREATE POLICY "Public can view media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'sns-media');

-- 완료. Storage > sns-media 에서 확인 가능합니다.
