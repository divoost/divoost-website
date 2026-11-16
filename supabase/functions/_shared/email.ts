// 공용 이메일 유틸 (회사 Resend 키로 발송 + email_queue 기록)
// 실패해도 호출측 기능을 막지 않도록 모든 에러는 내부에서 처리하고 boolean 반환.

// @ts-ignore Deno
const RESEND_API_KEY = () => (globalThis as any).Deno?.env?.get("RESEND_API_KEY") || "";
// @ts-ignore Deno
const RESEND_FROM = () => (globalThis as any).Deno?.env?.get("RESEND_FROM") || "DIVOOST <onboarding@resend.dev>";

export async function sendViaResend(to: string, subject: string, html: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  const key = RESEND_API_KEY();
  if (!key) return { ok: false, error: "RESEND_API_KEY 미설정" };
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: RESEND_FROM(), to: [to], subject, html }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.error) return { ok: false, error: d?.error?.message || `HTTP ${r.status}` };
    return { ok: true, id: d.id };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

// 잔액 부족 알림. 임계값 미만이고 24시간 내 같은 알림이 없을 때만 1회 발송.
// supabase: service_role 클라이언트. 호출측에서 await하되, 내부 예외는 삼키지 않고 반환값으로 전달.
export async function notifyLowBalance(
  supabase: any,
  opts: { userId: string; email: string; name?: string; balanceCents: number; thresholdCents?: number }
): Promise<{ sent: boolean; reason?: string }> {
  const threshold = opts.thresholdCents ?? 200; // 기본 ₩2,800 상당(=200센트)
  if (!opts.email) return { sent: false, reason: "no_email" };
  if (opts.balanceCents == null || opts.balanceCents >= threshold) return { sent: false, reason: "above_threshold" };

  // 사용자 알림 설정 확인 (opt-out 존중). 컬럼/행이 없으면 기본 발송.
  try {
    const { data: pref } = await supabase
      .from("notification_preferences")
      .select("email_low_balance")
      .eq("user_id", opts.userId)
      .single();
    if (pref && pref.email_low_balance === false) return { sent: false, reason: "opted_out" };
  } catch (_e) {
    // 설정 조회 실패 시 발송은 진행(알림 누락보다 과발송 방지는 dedup이 담당)
  }

  // 중복 방지: 24시간 내 동일 알림 존재 여부
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from("email_queue")
      .select("id")
      .eq("template_key", "low_balance")
      .eq("to_email", opts.email)
      .gte("created_at", since)
      .limit(1);
    if (recent && recent.length > 0) return { sent: false, reason: "already_sent_24h" };
  } catch (_e) {
    // 조회 실패 시 그대로 진행
  }

  const krw = Math.round((opts.balanceCents / 100) * 1400);
  const subject = "[DIVOOST] 크레딧 잔액이 부족합니다";
  const html =
    `<div style="font-family:sans-serif;max-width:480px;margin:auto">` +
    `<h2 style="color:#111">크레딧이 거의 소진되었습니다</h2>` +
    `<p>안녕하세요${opts.name ? " " + escapeHtml(opts.name) + "님" : ""},</p>` +
    `<p>현재 남은 크레딧이 <b>약 ₩${krw.toLocaleString()}</b> 상당으로 부족합니다. ` +
    `AI 생성이 중단되지 않도록 충전해 주세요.</p>` +
    `<p style="margin:24px 0"><a href="https://divoost.github.io/divoost-website/sns-platform/pages/billing.html" ` +
    `style="background:#4f46e5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">크레딧 충전하기</a></p>` +
    `<p style="color:#888;font-size:12px">이 알림을 끄려면 설정 &gt; 알림에서 변경할 수 있습니다.</p>` +
    `</div>`;

  const res = await sendViaResend(opts.email, subject, html);

  // 발송 이력 기록 (성공/실패 모두). 실패해도 호출측엔 영향 없음.
  try {
    await supabase.from("email_queue").insert({
      template_key: "low_balance",
      to_email: opts.email,
      to_name: opts.name || null,
      subject,
      body_html: html,
      status: res.ok ? "sent" : "failed",
      error_message: res.ok ? null : (res.error || "").slice(0, 300),
      provider: "resend",
      provider_message_id: res.id || null,
      sent_at: res.ok ? new Date().toISOString() : null,
      created_by: opts.userId,
    });
  } catch (_e) {
    // 기록 실패는 무시
  }

  return { sent: res.ok, reason: res.ok ? undefined : res.error };
}

function escapeHtml(s: string): string {
  return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}
