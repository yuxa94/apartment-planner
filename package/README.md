# PLANBY 단지배치 검토 — 배포 패키지

설치, 서버, API 키 없이 쓰는 파일 묶음입니다. 앱은 HTML 파일 하나로 열리고, LLM(Claude·ChatGPT)과는 JSON 파일을 주고받아 연결합니다.

| 파일 | 용도 |
|---|---|
| `planby-site-planner.html` | 단지배치 검토 앱 전체(스크립트·스타일 포함, 약 185 KB). 브라우저나 Claude 아티팩트로 엽니다. |
| `LLM-지침.md` | Claude 프로젝트 지침이나 ChatGPT GPT 지침에 붙여 넣는 작업 규칙입니다. |
| `planner-engine.js` | 앱과 같은 계산 엔진입니다. LLM의 코드 실행 도구에서 배치안을 검증할 때 씁니다. |
| `rules-reference.json` | 법령 출처, 확인일, 검토 항목별 구현 범위입니다. |

`../skill-package/apartment-feasibility/`에는 같은 절차가 Claude 스킬 형식으로 들어 있습니다.

## 앱 열기

- **브라우저**: `planby-site-planner.html`을 더블클릭합니다. 인터넷 연결 없이 동작합니다.
- **Claude Code / Claude 데스크톱**: 이 파일을 아티팩트로 게시해 달라고 요청하면 claude.ai 페이지로 열립니다. 게시한 페이지는 기본적으로 본인만 볼 수 있습니다.
- **ChatGPT**: 채팅창 안에서 이 크기의 HTML을 바로 실행하기는 어렵습니다. 앱은 브라우저로 열고, ChatGPT는 아래의 JSON 왕복에 씁니다.

작업 내용은 앱을 연 브라우저(주소)마다 따로 자동 저장됩니다. 다른 곳으로 옮길 때는 **프로젝트 저장**으로 JSON을 내보낸 뒤 **불러오기**로 엽니다. 배치안 버전도 이 JSON에 함께 들어갑니다.

## LLM과 함께 쓰기 (JSON 왕복)

1. Claude 프로젝트 지침이나 ChatGPT GPT 지침에 `LLM-지침.md` 내용을 넣습니다. 지식 파일로 `planner-engine.js`와 `rules-reference.json`도 올려 두면 좋습니다.
2. 앱에서 **프로젝트 저장**으로 JSON을 내려받아 대화에 첨부하고 요청을 적습니다.
   - 예: "101~105동이 모두 조건을 충족하는 정남향 배치안 2개 만들어줘"
3. LLM이 돌려준 `apartment-planner-patch/1` JSON을 파일로 저장해 앱의 **불러오기**로 적용합니다. 마음에 들면 **배치안 버전**으로 저장합니다.
4. 대화 중에 앱에서 다른 수정을 했다면 개정 번호가 바뀝니다. 최신 프로젝트를 다시 보내야 하며, 개정 번호가 다른 결과는 적용되지 않습니다.

Stage 2에서 만든 동평면(`apartment-planner-building/1`)도 **불러오기**로 열어 대지에 배치할 수 있습니다.

## 다시 만들기

```bash
node tools/build-package.cjs
```

시작 프로젝트를 넣어 만들려면 `--project`를 씁니다. 브라우저에 저장된 작업이 있으면 그쪽이 우선합니다.

```bash
node tools/build-package.cjs --project my-project.json
```

화면의 수치는 입력한 가정에 대한 기하 검토입니다. 법령·조례는 개정될 수 있으므로, 적용 시점에 원문을 다시 확인하세요.
