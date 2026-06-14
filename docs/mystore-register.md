# 자체몰(개인 쇼핑몰) 상품 등록 연동 가이드

크롤링/소싱한 상품을 **자체제작 PHP 쇼핑몰**(예: `gogo.apm.pe.kr`)에 자동 등록하는 연동입니다.

## 🏗 구조

```
[HubOnTrade listing.html]              [Supabase Edge Function]            [자체몰 서버]
 표준 상품 모델 ── Bearer(JWT) ──▶ register-mystore ── X-HubOnTrade-Token ──▶ register.php
                                   (토큰은 여기 env에만)                     상품 테이블 INSERT
```

- **토큰은 Edge Function 환경변수에만** 저장 → 브라우저/코드/깃에 절대 노출 안 됨
- 클라이언트는 로그인 JWT만 전달, 자체몰 주소도 클라이언트가 모름

## 🔒 보안 체크리스트 (배포 전 필수)

- [ ] **자체몰에 HTTPS 적용** (Let's Encrypt 무료). 현재 `http://`는 평문 전송이라 토큰 가로채기 위험 🔴
- [ ] `MYSTORE_TOKEN`은 랜덤 32자 이상 (`openssl rand -hex 24`)
- [ ] `register.php`의 INSERT는 **prepared statement(바인딩)** 만 사용 → SQL 인젝션 차단
- [ ] DB 접속정보는 자체몰 기존 `db.php`를 `include` 해서 재사용 (이 저장소엔 저장 X)

## 1) Edge Function 배포 (마스터)

```bash
supabase functions deploy register-mystore

# 환경변수(시크릿) 설정 — HTTPS 권장
supabase secrets set MYSTORE_ENDPOINT="https://내쇼핑몰주소/register.php"
supabase secrets set MYSTORE_TOKEN="$(openssl rand -hex 24)"   # 이 값을 register.php에도 동일 입력
```

## 2) 자체몰에 `register.php` 업로드 (FTP)

> ⚠️ **아래 INSERT의 테이블명·컬럼명은 자체몰 상품 테이블에 맞게 채워야 합니다.**
> phpMyAdmin → 상품 테이블 → "내보내기 → 구조만" 결과(`CREATE TABLE ...`)를 주시면 정확히 매핑해 드립니다.

```php
<?php
// register.php — HubOnTrade 자체몰 상품 등록 수신 엔드포인트
header('Content-Type: application/json; charset=utf-8');

// 0) 자체몰 기존 DB 연결 재사용 (비번은 여기 파일에 없음)
require __DIR__ . '/db.php';   // 예: $mysqli = new mysqli(...) 가 정의된 기존 파일

// 1) 토큰 검증 (Edge Function과 공유하는 시크릿)
$EXPECTED = 'PASTE_SAME_TOKEN_AS_MYSTORE_TOKEN';   // ← supabase secrets의 MYSTORE_TOKEN과 동일
$token = $_SERVER['HTTP_X_HUBONTRADE_TOKEN'] ?? '';
if (!hash_equals($EXPECTED, $token)) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'unauthorized']); exit;
}

// 2) 입력 파싱
$raw = file_get_contents('php://input');
$body = json_decode($raw, true);
$p = $body['product'] ?? null;
if (!$p || empty($p['title'])) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'invalid_product']); exit;
}

// 3) 값 준비 (표준 상품 모델)
$title   = mb_substr($p['title'], 0, 200);
$desc    = $p['description']   ?? '';
$price   = (int)($p['sell_price']   ?? 0);
$cost    = (int)($p['source_price'] ?? 0);
$ship    = (int)($p['shipping_cost']?? 0);
$cat1    = $p['category_major'] ?? '';
$cat2    = $p['category_minor'] ?? '';
$img     = (!empty($p['images']) && is_array($p['images'])) ? $p['images'][0] : '';
$tags    = (!empty($p['tags'])   && is_array($p['tags']))   ? implode(',', $p['tags']) : '';

// 4) prepared statement INSERT  ── ★ 테이블/컬럼명을 자체몰에 맞게 수정 ★
$sql = "INSERT INTO products
        (title, description, price, cost, shipping_fee, category1, category2, image_url, tags, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
$stmt = $mysqli->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'db_prepare_failed']); exit;
}
// s=string, i=integer 순서대로 바인딩
$stmt->bind_param('ssiiissss', $title, $desc, $price, $cost, $ship, $cat1, $cat2, $img, $tags);

if (!$stmt->execute()) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'db_insert_failed']); exit;
}

$newId = $stmt->insert_id;
// 5) 성공 — 등록된 상품 URL 반환 (몰의 상품 상세 URL 형식에 맞게 수정)
echo json_encode([
    'ok' => true,
    'product_url' => 'http://내쇼핑몰주소/?pn=product.view&no=' . $newId
]);
```

## 3) HubOnTrade에서 사용

- 소싱 트래커 → **상품 등록(listing.html)** → "🏠 내 쇼핑몰(자체몰)" 선택
- 상품 정보 입력 → **🚀 등록하기** → Edge Function 경유로 자체몰에 INSERT
- 등록 이력 패널에서 성공/실패 확인

## ✅ 진행 상태

- [x] HubOnTrade 클라이언트: 표준 상품 모델 + 자체몰 등록 경로 (`listing.html`)
- [x] Edge Function: `register-mystore` (JWT 검증 + 토큰 프록시 + 입력 검증)
- [ ] **마스터**: 상품 테이블 구조 제공 → `register.php` INSERT 컬럼 확정
- [ ] **마스터**: 자체몰 HTTPS 적용 + Edge Function 배포 + 시크릿 설정
- [ ] 테스트 1건 등록 → 일괄 등록

## 다음 확장 (어댑터만 추가)

같은 표준 상품 모델로 **카페24·쿠팡 Wing**은 각자의 공식 API 어댑터만 추가하면 됩니다.
