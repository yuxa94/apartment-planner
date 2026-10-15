/* Stage lock for this branch. null = all three stages (main).
   'units' = 01 단위세대 계획, 'combinations' = 02 동평면 조합, 'site' = 03 단지 배치 검토.
   When set, only that stage's tab is shown and the project autosaves under
   planby-apartment-v1-<stage> (falls back to the shared v1 key on first load). */
window.PLANBY_STAGE = 'site';
