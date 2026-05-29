# Instagram 실제 연동 가이드

## 1. 사전 요구사항

Instagram Graph API 사용을 위해 다음이 필요합니다:

1. **Instagram 비즈니스 계정** 또는 **크리에이터 계정** (개인 계정 불가)
2. **Facebook 페이지**에 Instagram 계정이 연결되어 있어야 함
3. Facebook 앱 (이미 설정한 `sns-연동` 앱 사용)
4. 권한:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_show_list`
   - `pages_read_engagement`

## 2. Instagram Business Account ID 찾기

Graph API Explorer 또는 다음 URL로 조회:

```
https://graph.facebook.com/v18.0/{PAGE_ID}?fields=instagram_business_account&access_token={PAGE_ACCESS_TOKEN}
```

응답 예시:
```json
{
  "instagram_business_account": { "id": "17841400000000000" },
  "id": "PAGE_ID"
}
```

`instagram_business_account.id` 값이 Business Account ID입니다.

## 3. 설정 페이지에 입력

`설정 → Instagram → 계정 추가`:
- **Access Token**: Facebook Page Access Token 그대로 사용 가능
- **Business Account ID**: 위에서 찾은 17841... 로 시작하는 ID
- **Username**: @계정명 (참고용)

## 4. Supabase Storage 버킷 설정 (필수)

Instagram은 **공개 URL**에 호스팅된 미디어만 받습니다. 브라우저의 data URI는 사용 불가.
Supabase Storage의 `sns-media` 버킷에 자동 업로드합니다.

### SQL Editor에서 실행:

```sql
-- Storage 버킷 생성 (Supabase Dashboard > Storage 에서 GUI로 생성도 가능)
INSERT INTO storage.buckets (id, name, public)
VALUES ('sns-media', 'sns-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 인증된 사용자가 업로드 가능
CREATE POLICY "Authenticated users can upload media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'sns-media');

-- 본인 파일 삭제 가능
CREATE POLICY "Users can delete own media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'sns-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 누구나 미디어 조회 가능 (Instagram이 받아갈 수 있도록)
CREATE POLICY "Public can view media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'sns-media');
```

## 5. 발행 동작

| 미디어 | Instagram 동작 |
|---|---|
| 텍스트만 | ❌ 발행 불가 (Instagram은 미디어 필수) |
| 이미지 1개 | ✅ 단일 이미지 게시 |
| 이미지 2~10개 | ✅ 캐러셀 게시 |
| 동영상 1개 | ✅ 릴스(Reels) |
| 동영상 다수 | ⚠ 첫 번째만 사용 |

## 6. 발행 흐름 (내부)

1. 첨부된 미디어를 Supabase Storage `sns-media` 버킷에 업로드
2. 업로드된 공개 URL 획득
3. `POST /{ig-account-id}/media` 로 컨테이너 생성 (caption + image_url/video_url)
4. 비디오/릴스인 경우 status_code가 `FINISHED`가 될 때까지 폴링
5. `POST /{ig-account-id}/media_publish` 로 실제 발행 (creation_id)
6. 발행 ID 반환

## 7. 자주 발생하는 오류

- **(#10) Application does not have permission for this action**: instagram_content_publish 권한 미부여
- **(#100) Object with ID '...' does not exist**: Business Account ID 오타
- **Media file is too big**: 이미지 8MB / 비디오 100MB 제한
- **Unsupported media type**: JPEG/PNG 이미지, MP4(H.264) 비디오만 지원
