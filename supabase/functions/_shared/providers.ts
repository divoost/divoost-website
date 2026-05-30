// AI 프로바이더별 호출 로직

export async function callReplicate(modelId: string, input: any, apiKey: string): Promise<string> {
  // 1) 예측 생성 (Prefer: wait=60으로 동기 대기 시도)
  const createUrl = `https://api.replicate.com/v1/models/${modelId}/predictions`;
  const createRes = await fetch(createUrl, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
      Prefer: "wait=60",
    },
    body: JSON.stringify({ input }),
  });

  if (!createRes.ok) {
    const txt = await createRes.text();
    throw new Error(`Replicate API error (${createRes.status}): ${txt.slice(0, 300)}`);
  }
  const pred = await createRes.json();
  if (pred.error) throw new Error(pred.error);

  // 동기 대기로 완료된 경우
  if (pred.status === "succeeded" && pred.output) return pred.output;
  if (pred.status === "failed" || pred.status === "canceled") {
    throw new Error(`생성 실패: ${pred.error || pred.status}`);
  }

  // 폴링
  const pollUrl = pred.urls?.get;
  if (!pollUrl) throw new Error("폴링 URL 없음");

  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const r = await fetch(pollUrl, { headers: { Authorization: `Token ${apiKey}` } });
    const d = await r.json();
    if (d.status === "succeeded" && d.output) return d.output;
    if (d.status === "failed" || d.status === "canceled") throw new Error(`생성 실패: ${d.error || d.status}`);
  }
  throw new Error("생성 시간 초과 (5분)");
}

export async function callFal(modelId: string, input: any, apiKey: string): Promise<any> {
  const submitUrl = `https://queue.fal.run/${modelId}`;
  const submitRes = await fetch(submitUrl, {
    method: "POST",
    headers: { Authorization: `Key ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const submitData = await submitRes.json();
  if (submitData.error || !submitData.request_id) throw new Error(submitData.error || "Fal.ai 요청 실패");

  const statusUrl = submitData.status_url || `https://queue.fal.run/${modelId}/requests/${submitData.request_id}/status`;
  const resultUrl = submitData.response_url || `https://queue.fal.run/${modelId}/requests/${submitData.request_id}`;

  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const sr = await fetch(statusUrl, { headers: { Authorization: `Key ${apiKey}` } });
    const sd = await sr.json();
    if (sd.status === "COMPLETED") {
      const rr = await fetch(resultUrl, { headers: { Authorization: `Key ${apiKey}` } });
      return await rr.json();
    }
    if (sd.status === "FAILED" || sd.status === "CANCELLED") throw new Error(`Fal.ai 실패: ${sd.error || sd.status}`);
  }
  throw new Error("Fal.ai 시간 초과");
}

export async function callOpenAI(input: any, apiKey: string): Promise<any> {
  const r = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d;
}
