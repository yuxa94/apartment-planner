# Stage 1 — 단위세대 계획 (`stage1-unit-plan`)

`stage.js`: `window.PLANBY_STAGE = 'units'` · 자동 저장 키 `planby-apartment-v1-units`

## 범위
59·74·84형 독립 원형의 내부 조닝을 만들고 수정한다. LLM 대화(JSON 파일 왕복)와 화면 직접 편집을 모두 지원한다.

## 주로 다루는 파일
- `units.js` — `createUnit`, `checkUnit`, `editRoom`, `mountUnits`
- `units.test.cjs`
- `assets/59A-plan.png`, `74A-plan.png`, `84A-plan.png` (원본 수정 금지, 출처는 `ASSET-SOURCES.md`)

## 다음 과제 (인계서 11·12절)
- 참고도면 치수 근거 보강: 거실 폭 59A 3,790 / 74A 4,590 / 84A 4,690 mm 등 원본 관찰값과 계획 가정을 구분
- 비정형 다각형 실 편집, 벽체·문·창
- 현관 / 접합면 / 채광면 등 동평면 조합용 연결 데이터 정의
- 전용면적·발코니·벽체 면적 산정 기준 분리
- 세대 원형 변경이 저장된 동 유형(`typologies`)에 전파되는 규칙 설계

## 다른 단계와의 계약
- 단위 m, 면적 ㎡, 프로젝트 스키마 `apartment-planner/1`
- `project.units`의 구조를 바꾸면 `state.js` 검증과 Stage 2의 `generateCombinations`를 함께 확인한다.
