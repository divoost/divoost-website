// 서버측 SNS 발행 (예약 자동발행용). 미디어는 공개 URL(Storage)로 전달받아 Graph API가 가져가게 함.
// 클라이언트 즉시발행(publish.html)과 달리 서버는 브라우저 Blob이 없으므로 URL 기반 업로드만 사용.

const GRAPH = "https://graph.facebook.com/v18.0";

export interface MediaItem {
  type: "image" | "video";
  url: string; // 공개 접근 가능한 URL (Supabase Storage public)
}

export interface PublishResult {
  ok: boolean;
  message: string;
  postId?: string;
  url?: string;
}

async function fbFetch(url: string, init?: RequestInit): Promise<any> {
  const r = await fetch(url, init);
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error) {
    const msg = d?.error?.message || `HTTP ${r.status}`;
    throw new Error(msg);
  }
  return d;
}

// ── Facebook 페이지 발행 ──
export async function publishFacebook(
  pageId: string,
  token: string,
  content: string,
  media: MediaItem[]
): Promise<PublishResult> {
  const images = media.filter((m) => m.type === "image");
  const videos = media.filter((m) => m.type === "video");

  // 영상 1건
  if (videos.length > 0) {
    const body = new URLSearchParams();
    body.append("file_url", videos[0].url);
    if (content) body.append("description", content);
    body.append("access_token", token);
    const d = await fbFetch(`https://graph-video.facebook.com/v18.0/${pageId}/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    return { ok: true, message: "동영상 발행", postId: d.id, url: `https://facebook.com/${d.id}` };
  }

  // 이미지 1장
  if (images.length === 1) {
    const body = new URLSearchParams();
    body.append("url", images[0].url);
    if (content) body.append("caption", content);
    body.append("access_token", token);
    const d = await fbFetch(`${GRAPH}/${pageId}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const id = d.post_id || d.id;
    return { ok: true, message: "이미지 발행", postId: id, url: `https://facebook.com/${id}` };
  }

  // 이미지 여러 장: 미발행 사진 생성 후 feed에 첨부
  if (images.length > 1) {
    const mediaFbids: Array<{ media_fbid: string }> = [];
    for (const img of images) {
      const b = new URLSearchParams();
      b.append("url", img.url);
      b.append("published", "false");
      b.append("access_token", token);
      const pd = await fbFetch(`${GRAPH}/${pageId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: b.toString(),
      });
      mediaFbids.push({ media_fbid: pd.id });
    }
    const body = new URLSearchParams();
    if (content) body.append("message", content);
    body.append("attached_media", JSON.stringify(mediaFbids));
    body.append("access_token", token);
    const d = await fbFetch(`${GRAPH}/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    return { ok: true, message: `이미지 ${images.length}장 발행`, postId: d.id, url: `https://facebook.com/${d.id}` };
  }

  // 텍스트 전용
  const body = new URLSearchParams();
  body.append("message", content || "");
  body.append("access_token", token);
  const d = await fbFetch(`${GRAPH}/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  return { ok: true, message: "텍스트 발행", postId: d.id, url: `https://facebook.com/${d.id}` };
}

// ── Instagram 발행 (컨테이너 생성 → 상태 폴링 → 발행) ──
export async function publishInstagram(
  igId: string,
  token: string,
  content: string,
  media: MediaItem[]
): Promise<PublishResult> {
  const images = media.filter((m) => m.type === "image");
  const videos = media.filter((m) => m.type === "video");
  if (images.length === 0 && videos.length === 0) {
    return { ok: false, message: "Instagram은 이미지 또는 영상이 필수입니다" };
  }

  // 컨테이너 생성
  const createBody = new URLSearchParams();
  if (videos.length > 0) {
    createBody.append("media_type", "REELS");
    createBody.append("video_url", videos[0].url);
  } else {
    createBody.append("image_url", images[0].url);
  }
  if (content) createBody.append("caption", content);
  createBody.append("access_token", token);

  const created = await fbFetch(`${GRAPH}/${igId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: createBody.toString(),
  });
  const creationId = created.id;
  if (!creationId) return { ok: false, message: "컨테이너 생성 실패" };

  // 상태 폴링 (최대 ~2분: 영상 처리 대기)
  for (let i = 0; i < 24; i++) {
    const st = await fbFetch(
      `${GRAPH}/${creationId}?fields=status_code&access_token=${encodeURIComponent(token)}`
    );
    if (st.status_code === "FINISHED") break;
    if (st.status_code === "ERROR" || st.status_code === "EXPIRED") {
      return { ok: false, message: `미디어 처리 실패: ${st.status_code}` };
    }
    await new Promise((r) => setTimeout(r, 5000));
  }

  // 발행
  const pubBody = new URLSearchParams();
  pubBody.append("creation_id", creationId);
  pubBody.append("access_token", token);
  const pub = await fbFetch(`${GRAPH}/${igId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: pubBody.toString(),
  });
  return { ok: true, message: "Instagram 발행", postId: pub.id, url: `https://instagram.com` };
}
