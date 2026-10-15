# Stage 2 — 동평면 조합 (`stage2-building-plan`)

`stage.js`: `window.PLANBY_STAGE = 'combinations'` · 자동 저장 키 `planby-apartment-v1-combinations`

## 범위
단위세대와 코어를 조합해 동평면 후보를 만들고 비교한 뒤 동 유형(`typologies`)으로 저장한다.

## 주로 다루는 파일
- `units.js` — `generateCombinations`, `mountCombinations`
- `units.test.cjs`
- `app.js`의 `placeTypology` (동 유형 → 단지배치 연결 지점)

## 다음 과제 (인계서 11·12절)
- HAUD 코어 한 유형과 원래 세대 조합을 먼저 정확히 재현 (수색4 A-303, A-375 참고)
- 현관·복도·계단·승강기·샤프트 연결 그래프
- 전수 조합 탐색, 중복 제거, 탈락 사유 통계와 탐색 범위 표시
- 현재 코어 5.8×6.2 m 등은 계획 가정임을 화면에 유지

## 다른 단계와의 계약
- `typologies`의 `width`, `depth`, `unitsPerFloor`, `unitArea`(평균), `totalUnitArea`(기준층 합), `coreArea`는 Stage 3이 사용한다. 필드를 바꾸면 `state.js` 검증과 `placeTypology`를 함께 수정한다.
- LH 세대와 HAUD 코어의 호환성은 가정하지 않는다.
