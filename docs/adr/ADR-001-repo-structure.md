# ADR-001: 리포 구조 — ez-flow 신규 리포 분리

## 상태
승인됨 (2026-06-07) — 기획서 §16 D1 권장안 채택, 마스터 지시로 확정.

## 컨텍스트
ez-flow는 Next.js(App Router) + Supabase 스택이다. 반면 기존 `divoost-website`는
빌드 도구 없는 순수 HTML/CSS/JS(ES5) + GitHub Pages 정적 호스팅이다(CLAUDE.md 기술스택).
ez-flow를 어디에 둘지 결정해야 한다: 기존 divoost 모노레포에 패키지로 넣을지,
완전히 새 리포로 분리할지.

## 결정
**ez-flow를 신규 리포로 분리한다.**
- 빌드/배포 파이프라인(Vercel FE + Supabase BE)을 divoost 정적 사이트와 독립 운영.
- 기획서 §4.3 디렉토리 구조(`ez-flow/`)를 신규 리포 루트로 채택.

## 대안
- **옵션 A: divoost 모노레포에 패키지로 편입** — ❌ 거절.
  - 정적 사이트(GitHub Pages)와 SSR 앱(Vercel)의 빌드/CI/배포 모델이 완전히 상이.
  - node_modules·빌드 산출물이 정적 리포를 비대화, CI 혼선.
- **옵션 B(채택): 신규 리포 분리.**

## 트레이드오프
✅ 장점
- 스택·CI·배포 독립 → 상호 간섭 없음.
- 권한/시크릿 분리(ez-flow 전용 Supabase 프로젝트·env).

❌ 단점
- 리포 2개 관리(이슈/PR 분산).
- 공통 자산(브랜드, 일부 유틸) 중복 가능 → 필요 시 별도 공유 패키지 검토.

⚠️ 위험
- 초기 셋업 비용(CI/배포/시크릿) 1회 발생.

## 결과 (파급)
- ez-flow 전용 Supabase 프로젝트 신규 생성 필요(현 divoost Supabase와 분리 권장 — 데이터 격리).
- 본 리포(`divoost-website`)에는 **기획·스키마·ADR 등 문서만** 보관, 구현 코드는 신규 리포.

## 후속 결정
- 신규 리포 네이밍/소유 조직(GitHub org) 확정.
- 공유 디자인 토큰/유틸을 별도 패키지로 뺄지(추후, 중복 누적 시).
