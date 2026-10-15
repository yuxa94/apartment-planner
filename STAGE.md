# Stage 3 — 단지 배치 검토 (`stage3-site-plan`)

`stage.js`: `window.PLANBY_STAGE = 'site'` · 자동 저장 키 `planby-apartment-v1-site`

## 범위
대지에 여러 동을 배치하고, 이동·회전·층수 변경 시 경계 이격, 인동거리, 정북 이격, 개략 사업 규모를 실시간으로 다시 계산한다.

## 주로 다루는 파일
- `app.js` — 배치 SVG, 선택·드래그·회전, 후보 격자, 모달, DXF·JSON 출력
- `engine.js` — `footprint`, `polygonDistance`, `evaluateSite`, `canPlace`
- `state.js` — `applyPatch` (LLM 자동 변경 JSON: `x`, `y`, `rotation`, `floors`만)
- `engine.test.cjs`, `state.test.cjs`

## 다음 과제 (인계서 12절 3번 — 최우선)
- 선택 표시, 드래그·회전 조작감
- 거리선과 요구값의 가독성, 위반 사유와 수치 변화 표시
- 후보 격자의 의미 전달 (법정 연속 허용 영역이 아님)
- 이후: 채광면/측벽·부분 높이·지반차 규칙, 실제 대지·주변 건물 입력, 일조 분석, 사업 수지

## 원칙
- 사용자 가정에 따른 기하 검토와 법정 적합 판정을 구분하고, 미구현 검토는 "미검토"로 둔다.
- 패치의 `baseRevision`, 동 ID, 잠금 규칙을 유지한다.
