---
name: sdd-requirements
description: 스펙 요구사항 생성. feature의 requirements.md 작성. EARS 형식, WHAT만(HOW 없음), 스티어링과 정렬 검증 포함. spec-requirements 커맨드에서 사용.
allowed-tools: Bash Read Write Edit Glob Grep LS WebSearch WebFetch
---

# 요구사항 생성

## 단계

1. `.sdd/specs/$FEATURE/spec.json`, `requirements.md` 읽기 (기존 내용 파악)
2. `.sdd/steering/` 전체 읽기
   - 스티어링 없으면 경고: "스티어링 없이 생성 → 방향 없을 수 있음. `/sdd:steering` 권장"
3. EARS 형식으로 requirements.md 생성 (아래 규칙 적용)
4. **스티어링 정렬 검증**:
   - 생성된 요구사항이 `product` 스티어링(목적, 타겟)과 일치하는가?
   - 충돌 항목: `⚠️ 스티어링 충돌: [내용]` 표시 후 사용자 판단 요청
5. `spec.json` 업데이트: `phase: "requirements-generated"`, `approvals.requirements.generated: true`

## 생성 규칙

- **WHAT만**: 무엇을 해야 하는가. HOW(어떻게)는 설계 문서에서 다룸
- **테스트 가능**: 명확한 통과/실패 기준
- **구체적**: "빠르게", "쉽게", "적절히" 사용 금지
- **단일 관심사**: 요구사항 1개 = 동작 1개
- **코드 예시 없음**: 절대 포함하지 않음
- **기술 스택 참조 최소화**: 설계 문서에서 다룸

## 번호 체계

- 최상위: `1`, `2`, `3`
- 하위: `1.1`, `1.2`, `2.1`
- 3단계 이상 금지

## 그룹화

논리적 영역별로 그룹화:
- 사용자 기능 (핵심 사용 케이스)
- 시스템 동작 (비기능 요구사항)
- 외부 인터페이스 (API, 통합)
- 제약 조건 (보안, 성능, 규정)

## 수락 기준 형식

```
**1.1** [EARS 요구사항]
- AC1: [구체적 테스트 조건]
- AC2: [엣지 케이스]
```

## 생성 프로세스

1. 먼저 전체 요구사항 생성 — 질문 먼저 하지 않음
2. 누락된 영역 자체 판단으로 채움
3. 모호한 부분은 최선의 해석으로 진행, 가정사항 명시
4. 각 요구사항에 수락 기준 최소 1개

## EARS 형식 상세

→ `references/ears-format.md` 참조
