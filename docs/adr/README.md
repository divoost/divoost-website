# ADR (Architecture Decision Records) — ez-flow

> 이 디렉토리는 ez-flow 플랫폼의 주요 기술·아키텍처 의사결정을 기록한다.
> 형식: CLAUDE.md E1~E7 (`docs/rules/adr-decision-7.md`) 표준 템플릿.
> 근거 기획서: [`docs/specs/ez-flow-기획서.md`](../specs/ez-flow-기획서.md) §16(미정사항) · §6.6(보안 미정사항).

## 인덱스

| ADR | 기획서 매핑 | 제목 | 상태 | Type |
|---|---|---|---|---|
| [ADR-001](ADR-001-repo-structure.md) | D1 | 리포 구조 — 신규 리포 분리 | ✅ 승인 | 1(비가역) |
| [ADR-002](ADR-002-mobile-strategy.md) | D2 | 모바일 전략 — PWA 우선 | ✅ 승인 | 2(가역) |
| [ADR-003](ADR-003-trellis-migration.md) | D3 | Trellis 마이그레이션 범위 — 신규 시작 + 선택 이관 | ✅ 승인 | 1(비가역) |
| [ADR-004](ADR-004-guest-access-policy.md) | D4 + §6.6 | Guest 접근 정책 — 초대 토큰 가입(보안 확정) + 시트 과금(영업 보류) | 🔶 부분 승인 | 1/2 |
| [ADR-005](ADR-005-meeting-audio-retention.md) | D5 + §6.6 | 회의 음성 보존 — 전사 후 즉시 삭제 | ✅ 승인 (보안) | 2(가역) |
| [ADR-006](ADR-006-ai-data-scope.md) | D6 + §6.6 | AI 전송 데이터 범위 + LLM 학습 옵트아웃 | ✅ 승인 (보안) | 1(비가역) |
| [ADR-007](ADR-007-llm-provider.md) | D7 | LLM 제공사 — 어댑터 기반 병행 추상화 | ✅ 승인 | 2(가역) |
| [ADR-008](ADR-008-commerce-integration.md) | D8 | 커머스(IOR) 연동 — Phase 4 보류 | ⏳ 제안(보류) | 2(가역) |

## 상태 범례
- ✅ **승인**: 채택·시행. (마스터 지시 2026-06-07로 기획서 권장안 확정)
- 🔶 **부분 승인**: 보안 항목은 확정, 비즈니스 항목은 영업 확정 대기.
- ⏳ **제안(보류)**: 후속 Phase/추가 검토에서 재논의 (종료조건은 본문 참조).

## 작성 규칙
- 한 ADR = 한 결정. 트레이드오프(✅장점/❌단점/⚠️위험) 필수 (E2).
- Type 1(비가역)은 신중, Type 2(가역)는 70% 확신이면 진행 (E3).
- 거절된 옵션과 그 이유를 반드시 기록 (E4).
- 새 ADR은 다음 번호로 추가하고 위 인덱스 갱신.
