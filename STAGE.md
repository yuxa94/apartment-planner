# Stage 1 — 단위세대 계획 (`stage1-unit-plan`)

`stage.js`: `window.PLANBY_STAGE = 'units'` · 자동 저장 키 `planby-apartment-v1-units`

## 범위
59·74·84형 독립 원형의 내부 조닝을 만들고 수정한다. LLM 대화(JSON 파일 왕복)와 화면 직접 편집을 모두 지원한다.

## 주로 다루는 파일
- `units.js` — `createUnit`, `checkUnit`, `editRoom`, `mountUnits`
- `units.test.cjs`
- `assets/59A-plan.png`, `74A-plan.png`, `84A-plan.png` (원본 수정 금지, 출처는 `ASSET-SOURCES.md`)

## 구현됨 (2026-10-15)
- **참고도면 추적 배치 (layoutVersion 2)**: 59A·74A·84A 공식 안내도의 표기 치수로 꺾인 외곽(`outline`)과 14~16개 실을 새로 구성. 세 타입 모두 외곽을 빈틈 없이 채운다. 벽 두께·중심선은 구분하지 않은 개략값. 이전 기본 템플릿을 그대로 쓰던 세대는 자동 교체, 편집한 세대는 유지(직사각형 외곽 부여).
- **빈 영역 채우기** (`fillUnit`): 잠기지 않은 실을 0.1 m씩 번갈아 늘린다. 거실·주방·침실·복도가 먼저, 욕실·수납은 나중. 엇갈린 L자 틈은 이웃 실과 경계를 주고받아 정리(`repairGaps`). 직사각형으로 메울 수 없는 틈은 화면에 '빈 영역'으로 남는다.
- **외곽선 편집**: 변 드래그 시 그 벽에 붙은 실이 함께 늘거나 줄어든다. 변 더블클릭으로 꺾임점 추가(직각 유지 돌출/함몰), 꼭짓점 드래그(직각 유지 옵션), Delete로 꼭짓점 삭제, 좌표 JSON 직접 입력, 변 길이(mm) 표시, 참고도면 겹쳐 보기.
- 실 이름·용도 변경, 추가(빈 영역에 생성 후 자동 확장), 삭제, 개별 채우기.
- **Claude 왕복 (API 없음)**: 'Claude에 요청' → 요청문 복사/파일 저장 → Claude 대화에 붙여넣기 → 받은 JSON을 'Claude 결과 적용'에 붙여넣기 → 검토 후 적용.

## 데이터 계약 추가 (하위 호환)
- `project.units[i].outline`: 외곽 꼭짓점 `[[x,y],...]` (m, 원점 = 경계상자 좌상단). `width`/`depth`는 계속 외곽 경계상자 크기라 Stage 2 조합 생성은 그대로 동작한다. 단, 59형 깊이 8.3→9.2 m 등 경계상자 치수가 바뀌어 동평면 후보 크기가 달라진다.
- 실 `category`: `living | bedroom | kitchen | wet | service | circulation | balcony`.
- `apartment-planner-unit-request/1` (요청) / `apartment-planner-unit-patch/1` (결과):
  `{ schema, baseRevision, unitType, outline?, rooms?, fill?, summary? }` — `rooms`를 보내면 전체 실 목록 교체. 개정 불일치·잠긴 실 변경·미지원 항목·잘못된 category는 거부.
- `state.js`는 수정하지 않았다(외곽 검증은 `units.js`의 `normalizeUnit`이 담당).

## 다음 과제 (인계서 11·12절)
- 비직사각형(L자 등) 실 형상 — 현재는 직사각형 실만 지원해 꺾인 외곽 주변에 틈이 남을 수 있음
- 벽체·문·창
- 현관 / 접합면 / 채광면 등 동평면 조합용 연결 데이터 정의
- 전용면적·발코니·벽체 면적 산정 기준 분리
- 세대 원형 변경이 저장된 동 유형(`typologies`)에 전파되는 규칙 설계

## 다른 단계와의 계약
- 단위 m, 면적 ㎡, 프로젝트 스키마 `apartment-planner/1`
- `project.units`의 구조를 바꾸면 `state.js` 검증과 Stage 2의 `generateCombinations`를 함께 확인한다.
