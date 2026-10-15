window.SLIDES = [
  {
    "cards": [],
    "prompt": null,
    "checks": [],
    "repair": null,
    "note": "실습 자료를 먼저 준비한 뒤 세대 편집 → 동평면 조합 → 단지배치를 진행한다. 각 실습 요청문에 관련 커밋의 기준 결과와 소스 링크가 포함되어 있다.",
    "image": null,
    "visual": null,
    "links": [],
    "explain": [],
    "kind": "cover",
    "part": "WORKSHOP · 준비 + 11단계",
    "time": "240분 · Windows",
    "title": "대화로 만드는\n공동주택 초기계획 도구",
    "lead": "59·74·84형 세대 편집부터 동평면 후보 탐색, 대지 배치와 JSON 왕복까지 직접 만들어 봅니다.",
    "gitRefs": [],
    "originalSlide": 1
  },
  {
    "cards": [],
    "prompt": null,
    "checks": [],
    "repair": null,
    "note": "세 단계마다 약 70분. 각 단계 앞부분은 실제 화면으로 무엇이 바뀌었는지 보고, 뒷부분에서 같은 요청을 직접 넣는다. 설치나 실행이 늦은 수강생은 강사 화면과 단계별 단일 HTML 결과물로 다음 실습에 참여한다.",
    "image": null,
    "visual": null,
    "links": [],
    "explain": [],
    "kind": "agenda",
    "part": "수업 안내",
    "time": "12단계 · 총 240분",
    "title": "준비 + 11단계",
    "lead": "실습 자료 준비 → 단위세대 편집 → 동평면 조합 → 인동거리·3D → 배치안 저장",
    "gitRefs": [],
    "originalSlide": 2
  },
  {
    "cards": [],
    "prompt": null,
    "checks": [],
    "repair": null,
    "note": "단위세대 평면(apartment-planner-unit/1) → 동평면 후보(apartment-planner-building/1) → 단지 프로젝트(apartment-planner/1)와 배치 변경(apartment-planner-patch/1). 단계 사이를 파일 형식으로 고정해 두었기 때문에 세 세션이 동시에 일해도 서로의 코드를 기다리지 않는다. 단위는 모두 m·㎡.",
    "image": null,
    "visual": "flow3",
    "links": [
      [
        "인계 문서 · CLAUDE_HANDOFF.md",
        "#resources"
      ]
    ],
    "explain": [],
    "kind": "diagram",
    "part": "00 · 인계와 작업 분리",
    "time": "00–04분",
    "title": "세 단계는 JSON 파일로 이어집니다",
    "lead": "각 단계는 혼자 열리는 화면이고, 다음 단계에는 정해진 형식의 JSON만 넘깁니다.",
    "gitRefs": [],
    "originalSlide": 3
  },
  {
    "kind": "cards",
    "part": "00 · 실습 준비",
    "time": "00–07분",
    "title": "오늘 만들 도구와 준비할 자료",
    "lead": "세대 평면을 고치고, 동평면 후보를 만든 뒤, 대지에 배치합니다. 필요한 도면과 입력 파일은 모두 자료실에 있습니다.",
    "cards": [
      [
        "Stage 1",
        "59A·74A·84A 참고 이미지와 단위세대 시작 코드"
      ],
      [
        "Stage 2",
        "수색4 PDF·계양 코어 DWG·추출 결과·세대 JSON"
      ],
      [
        "Stage 3",
        "청주월명 PDF·동평면 JSON·계산 엔진"
      ],
      [
        "진행 방식",
        "실습 요청 복사 → 코드 수정 → 화면 확인 → 다음 단계"
      ]
    ],
    "checks": [],
    "links": [
      [
        "수업 에셋과 준비 안내",
        "materials.html"
      ]
    ],
    "note": "설치와 파일 준비는 수업 전에 완료. 코드 개발은 Claude Code와 Node, CAD 읽기는 AutoCAD MCP가 필요하다. CAD 환경이 없으면 cores.json을 사용한다."
  },
  {
    "kind": "lab",
    "part": "00 · 실습 준비",
    "time": "07–15분",
    "title": "첫 실습 · 단위세대 화면 살펴보기",
    "lead": "Stage 1 시작 코드를 새 수업 폴더에 준비하고 참고 이미지 세 장을 함께 둡니다.",
    "prompt": "첨부한 Stage 1 시작 소스를 새 수업 폴더에 복원하고 단위세대 화면을 실행해줘. assets의 59A·74A·84A 참고 이미지가 열리는지 확인해줘.\n평형을 바꾸고 실을 선택해 치수·면적·잠금이 어디에 표시되는지 설명해줘. 다음 실습 전에는 기능을 추가하지 마.\n\n[이 실습의 자료와 기준 결과]\n자료·에셋: https://yuxa94.github.io/apartment-planner/materials.html\n시작 소스: https://github.com/yuxa94/apartment-planner/tree/c878de6f48ad3e2220dc225b60301ef0ad4aa69f\n관련 커밋 c878de6: https://github.com/yuxa94/apartment-planner/commit/c878de6f48ad3e2220dc225b60301ef0ad4aa69f\n해당 커밋 소스: https://github.com/yuxa94/apartment-planner/tree/c878de6f48ad3e2220dc225b60301ef0ad4aa69f\n위 소스는 기준 결과 비교용입니다. 새 기능을 만드는 실습에서는 현재 수업 코드를 수정하고, 막혔을 때만 기준 소스와 비교해 주세요.",
    "checks": [
      "59·74·84형을 전환할 수 있다.",
      "실을 선택하면 치수와 면적을 확인할 수 있다.",
      "참고 이미지 3개가 보인다."
    ],
    "repair": "참고 이미지가 안 보여. assets/59A-plan.png, 74A-plan.png, 84A-plan.png 경로와 파일명을 확인해줘.",
    "explain": [],
    "links": [],
    "gitRefs": [
      "c878de6"
    ],
    "note": "소스와 에셋을 먼저 준비해 실제 화면부터 살핀다. Git 운영은 보조 안내 페이지에서 필요할 때만 참조한다."
  },
  {
    "cards": [],
    "prompt": null,
    "checks": [],
    "repair": null,
    "note": "v1은 59형이 12.9×8.3m 사각형 하나에 실들이 떨어져 있었다. LH 양주회천 A-26 안내도의 표기 치수로 59A·74A·84A 외곽과 실을 다시 만들었고 세 타입 모두 빈 영역 0㎡. 외곽 면적에 발코니·벽체가 들어가 59형이 102.5㎡로 전용 59㎡보다 크다는 점을 함께 설명한다. 벽 두께·중심선은 구분하지 않은 개략값.",
    "image": "assets/u-editor.png",
    "visual": null,
    "links": [
      [
        "해당 단계 앱 열기",
        "apps/stage1/index.html"
      ]
    ],
    "explain": [],
    "kind": "image",
    "part": "01 · 참고도면으로 세대 외곽 만들기",
    "time": "16–19분",
    "title": "참고도면 치수로 다시 그린 59형",
    "lead": "사각형 하나였던 외곽을 꺾인 외곽으로 바꾸고, 14~16개 실이 빈틈 없이 채웁니다.",
    "aside": "Stage 1 편집기를 기본 예시 데이터로 다시 캡처한 화면입니다. 실제 수업 결과는 참여자마다 다를 수 있습니다.",
    "gitRefs": [
      "c310442"
    ],
    "originalSlide": 7
  },
  {
    "cards": [],
    "prompt": "지금 수동으로 실을 배치할 수 있는 건 좋은데, 주어진 외곽 안을 실들이 꽉 차게 채울 수 있어야 해.\n외곽선도 직접 지정할 수 있게 해줘.\nAPI 키 없이 너한테 요청해서 고칠 수 있는 형태로 만들고, assets의 59A·74A·84A 참고도면을 참고해서 다시 구성해줘.\n\n[이 실습의 자료와 기준 결과]\n자료·에셋: https://yuxa94.github.io/apartment-planner/materials.html\n시작 소스: https://github.com/yuxa94/apartment-planner/tree/c878de6f48ad3e2220dc225b60301ef0ad4aa69f\n관련 커밋 c310442: https://github.com/yuxa94/apartment-planner/commit/c310442ef8b3e227df65a002cb363010f975cc3a\n해당 커밋 소스: https://github.com/yuxa94/apartment-planner/tree/c310442ef8b3e227df65a002cb363010f975cc3a\n위 소스는 기준 결과 비교용입니다. 새 기능을 만드는 실습에서는 현재 수업 코드를 수정하고, 막혔을 때만 기준 소스와 비교해 주세요.",
    "checks": [
      "59·74·84형 외곽이 꺾인 형태로 바뀌었다.",
      "“빈 영역 채우기” 후 빈 영역이 0㎡다.",
      "외곽선 편집에서 변을 끌면 붙은 실이 같이 늘어난다.",
      "참고도면 겹쳐 보기에서 벽선과 크게 어긋나지 않는다."
    ],
    "repair": "채우기를 눌러도 L자 틈이 남아. 이웃 실과 경계를 주고받아 틈을 정리하고, 직사각형으로 못 메우는 틈은 화면에 빈 영역으로 표시해줘.",
    "note": "실제 결과: 테스트 35→42개. 심하게 왜곡한 외곽에서도 70%가 완전히 채워졌고 남은 틈의 중앙값은 0. 참고도면 겹쳐 보기에서 벽선과 0.1~0.2m 이내. 이미지 치수 판독값이므로 실측·시공 치수로 다루지 않는다.",
    "image": null,
    "visual": null,
    "links": [],
    "explain": [
      [
        "꽉 차게",
        "잠기지 않은 실을 0.1 m씩 늘려 외곽을 채웁니다. 거실·주방·침실·복도가 먼저, 욕실·수납은 나중입니다."
      ],
      [
        "외곽선 직접 지정",
        "변 드래그, 더블클릭으로 꺾임점, 꼭짓점 이동·삭제, 좌표 직접 입력을 지원합니다."
      ],
      [
        "API 키 없이",
        "앱이 요청문을 만들고 사람이 Claude에 붙여넣는 방식입니다. 다음 단계에서 자세히 봅니다."
      ]
    ],
    "kind": "lab",
    "part": "01 · 참고도면으로 세대 외곽 만들기",
    "time": "19–31분",
    "title": "1 · 외곽선을 정하고 꽉 차게 채우기",
    "lead": "Stage 1 세션(course-stage1)에 입력합니다.",
    "gitRefs": [
      "c310442"
    ],
    "originalSlide": 8
  },
  {
    "cards": [],
    "prompt": null,
    "checks": [],
    "repair": null,
    "note": "조작: 변 드래그(붙은 실 함께), 변 더블클릭(직각 유지 돌출·함몰), 꼭짓점 드래그, Delete로 꼭짓점 삭제, 좌표 JSON 입력. outline 필드는 하위 호환이며 width/depth는 외곽 경계상자 크기로 유지해 Stage 2가 그대로 동작한다.",
    "image": "assets/u-outline.png",
    "visual": null,
    "links": [
      [
        "해당 단계 앱 열기",
        "apps/stage1/index.html"
      ]
    ],
    "explain": [],
    "kind": "image",
    "part": "01 · 참고도면으로 세대 외곽 만들기",
    "time": "31–35분",
    "title": "외곽선 편집 모드",
    "lead": "변을 끌면 그 벽에 붙은 실이 함께 움직이고, 변 길이는 mm로 표시됩니다.",
    "aside": "외곽 꼭짓점은 오른쪽 패널에서 좌표 JSON으로도 고칠 수 있습니다. 직각 유지 옵션을 끄면 자유롭게 움직입니다.",
    "gitRefs": [
      "c310442"
    ],
    "originalSlide": 9
  },
  {
    "cards": [],
    "prompt": null,
    "checks": [],
    "repair": null,
    "note": "요청문(apartment-planner-unit-request/1)에는 현재 도면 JSON, 규칙, 영역 표시가 모두 들어간다. Claude는 patch JSON 하나를 코드 블록으로 답한다. 앱은 baseRevision이 다르거나 잠긴 실을 바꾸면 거부한다. 요청 후 화면에서 도면을 고쳤다면 요청문을 다시 복사해야 한다. 같은 구조가 Stage 3의 배치 변경(apartment-planner-patch/1)에도 쓰인다.",
    "image": null,
    "visual": "roundtrip",
    "links": [],
    "explain": [],
    "kind": "diagram",
    "part": "02 · API 없이 Claude와 주고받기",
    "time": "35–39분",
    "title": "API 키 없이 Claude와 주고받는 방법",
    "lead": "앱은 요청문을 만들고 결과를 검사할 뿐, 대화는 사람이 옮깁니다.",
    "gitRefs": [
      "c310442"
    ],
    "originalSlide": 10
  },
  {
    "cards": [],
    "prompt": "Claude에 요청할 때 창이 새로 떠서 보기가 불편해. 오른쪽에 채팅창 하나를 만들어줘.\n요청을 쓰면 요청문이 복사되고, Claude 답변을 같은 입력창에 통째로 붙여넣으면 자동으로 검토한 뒤 적용 버튼이 나오게 해줘.\n\n[이 실습의 자료와 기준 결과]\n자료·에셋: https://yuxa94.github.io/apartment-planner/materials.html\n시작 소스: https://github.com/yuxa94/apartment-planner/tree/c878de6f48ad3e2220dc225b60301ef0ad4aa69f\n관련 커밋 833527c: https://github.com/yuxa94/apartment-planner/commit/833527cf7e31c1f3edd0690d02d52139d5ede437\n해당 커밋 소스: https://github.com/yuxa94/apartment-planner/tree/833527cf7e31c1f3edd0690d02d52139d5ede437\n위 소스는 기준 결과 비교용입니다. 새 기능을 만드는 실습에서는 현재 수업 코드를 수정하고, 막혔을 때만 기준 소스와 비교해 주세요.",
    "checks": [
      "요청을 쓰고 Ctrl+Enter를 누르면 요청문이 복사된다.",
      "답변을 붙여넣으면 “답변 검토” 말풍선으로 바뀐다.",
      "“이 수정안 적용” 후 Ctrl+Z로 되돌릴 수 있다."
    ],
    "repair": "답변을 붙여넣었는데 개정 번호가 달라서 거부됐어. 요청문을 다시 복사해야 하는 이유를 말풍선에 안내해줘.",
    "note": "실제로 사용자가 “창이 새로 띄워져서 보기가 불편하다”고 해서 바뀐 기능이다. 이 단계에서 “Astra에 수정 요청” 버튼(이전 워크플로 명칭)도 지웠다. 세 브랜치가 같은 문구로 지워 병합 충돌을 피했다.",
    "image": null,
    "visual": null,
    "links": [],
    "explain": [
      [
        "요청문",
        "사람이 쓴 요청에 현재 도면 JSON과 규칙을 붙인 글입니다. Claude는 이것만 보고 답합니다."
      ],
      [
        "자동으로 검토",
        "앱이 답변에서 JSON을 찾아 공간 수, 빈 영역, 외곽 이탈을 먼저 보여 줍니다."
      ],
      [
        "적용 버튼",
        "사람이 확인한 다음에만 도면이 바뀝니다. 대화 기록은 새로 고치면 사라집니다."
      ]
    ],
    "kind": "lab",
    "part": "02 · API 없이 Claude와 주고받기",
    "time": "39–47분",
    "title": "2A · 팝업 대신 대화 패널 하나로",
    "lead": "팝업 두 개로 시작한 왕복을 오른쪽 패널 하나로 합칩니다.",
    "gitRefs": [
      "833527c"
    ],
    "originalSlide": 11
  },
  {
    "cards": [],
    "prompt": "여기에 빈 도면을 추가할 수 있게 해줘.\n그리고 만들어진 도면 위에 빨간색으로 영역을 그릴 수 있게 해줘. LLM에게 “이 부분으로 무엇을 옮겨달라”처럼 요청할 수 있게 하고 싶어.\n\n[이 실습의 자료와 기준 결과]\n자료·에셋: https://yuxa94.github.io/apartment-planner/materials.html\n시작 소스: https://github.com/yuxa94/apartment-planner/tree/c878de6f48ad3e2220dc225b60301ef0ad4aa69f\n관련 커밋 c02fdf2: https://github.com/yuxa94/apartment-planner/commit/c02fdf2487a5371d2928b32557c0f5e7be30eeae\n해당 커밋 소스: https://github.com/yuxa94/apartment-planner/tree/c02fdf2487a5371d2928b32557c0f5e7be30eeae\n위 소스는 기준 결과 비교용입니다. 새 기능을 만드는 실습에서는 현재 수업 코드를 수정하고, 막혔을 때만 기준 소스와 비교해 주세요.",
    "checks": [
      "“＋ 빈 도면”으로 이름·기준 평형·크기를 정해 새 도면이 생긴다.",
      "✎ 영역 표시로 그린 영역이 A, B… 로 이름 붙는다.",
      "요청문에 영역 좌표와 걸친 실이 marks로 들어간다."
    ],
    "repair": "영역을 그렸는데 요청문에 좌표만 있고 어떤 실 위인지가 없어. 영역마다 겹친 실과 면적을 같이 넣어줘.",
    "note": "공통 검증 모듈(state.js)을 고치지 않으려고 빈 도면도 59/74/84 중 기준 평형을 고르게 했다. 편집기는 이때부터 평형이 아니라 도면 id(selectedUnitId)로 도면을 고른다. Stage 2와 합칠 때 확인할 지점이다.",
    "image": null,
    "visual": null,
    "links": [],
    "explain": [
      [
        "빈 도면",
        "평형 템플릿이 아닌 새 도면입니다. 기준 평형은 기존 데이터 검증(59/74/84)을 통과하기 위한 분류값입니다."
      ],
      [
        "빨간 영역",
        "프로젝트에는 저장하지 않는 요청용 표시입니다. 새로 고치면 사라집니다."
      ],
      [
        "무엇을 옮겨달라",
        "대화창의 칩을 누르면 “영역 A”가 문장에 들어갑니다."
      ]
    ],
    "kind": "lab",
    "part": "02 · API 없이 Claude와 주고받기",
    "time": "47–53분",
    "title": "2B · 빨간 영역으로 위치를 가리키기",
    "lead": "“여기”를 말로 설명하는 대신 도면 위에 A, B 영역을 그려 요청에 넣습니다.",
    "gitRefs": [
      "c02fdf2"
    ],
    "originalSlide": 12
  },
  {
    "cards": [
      [
        "현관",
        "영역 A 자리에 그대로 넣음 → A 방향(남동 모서리)으로 옮기고 동선을 다시 짬"
      ],
      [
        "침실 3",
        "현관에 밀려 폭이 좁아짐 → 크기 유지"
      ],
      [
        "거실·복도",
        "따로 둠 → 맨 아래 큰 사각형 하나로 합치고 위 레이어로 덮음"
      ],
      [
        "지침",
        "해석 규칙 없음 → MODEL-INSTRUCTIONS.md에 “쪽으로 = 방향” 규칙 추가"
      ]
    ],
    "prompt": null,
    "checks": [],
    "repair": null,
    "note": "요청: “영역 A 쪽으로 현관 이동시켜주고, 거실이랑 복도는 합쳐줘.” 사용자 피드백: “A 자리에 그대로 넣으란 게 아니라 A 쪽으로 현관을 옮기면서 내부 배치도 새로 하라는 뜻이야.” 이런 해석 차이를 모델 지침에 남겨 두면 다음 대화에서 반복되지 않는다.",
    "image": null,
    "visual": null,
    "links": [],
    "explain": [],
    "kind": "table",
    "part": "02 · API 없이 Claude와 주고받기",
    "time": "53–55분",
    "title": "“A 자리에”와 “A 쪽으로”는 다릅니다",
    "lead": "같은 요청문에 대한 첫 답변과, 사용자가 의도를 바로잡은 뒤의 답변입니다.",
    "gitRefs": [
      "c02fdf2"
    ],
    "originalSlide": 13
  },
  {
    "cards": [],
    "prompt": null,
    "checks": [],
    "repair": null,
    "note": "면적표를 레이어 패널로 바꿨다. 드래그 또는 ▲▼로 순서를 바꾸고, 완전히 가려진 실만 경고한다. 선택한 실은 가려져도 점선으로 전체 범위를 보여 준다.",
    "image": "assets/u-chat.png",
    "visual": null,
    "links": [
      [
        "해당 단계 앱 열기",
        "apps/stage1/index.html"
      ]
    ],
    "explain": [],
    "kind": "image",
    "part": "03 · 편집감 다듬기",
    "time": "55–58분",
    "title": "레이어 패널과 Claude 대화 패널",
    "lead": "실 목록이 레이어가 되고, 위 레이어가 겹친 면적을 차지합니다. 그 아래에 대화 패널이 있습니다.",
    "aside": "74형 화면입니다. 레이어 행의 숫자는 보이는 면적 / 전체 면적입니다.",
    "gitRefs": [
      "833527c"
    ],
    "originalSlide": 14
  },
  {
    "cards": [],
    "prompt": "각각의 실 크기도 조절할 수 있게 해줘.\n그리고 공간 면적표 대신 레이어로 만들어서 보이는 순서를 바꿀 수 있게 해줘. 위로 올라간 공간이 아래 공간의 면적을 점유하는 형식이면 좋겠어.\n\n[이 실습의 자료와 기준 결과]\n자료·에셋: https://yuxa94.github.io/apartment-planner/materials.html\n시작 소스: https://github.com/yuxa94/apartment-planner/tree/c878de6f48ad3e2220dc225b60301ef0ad4aa69f\n관련 커밋 4f4033b: https://github.com/yuxa94/apartment-planner/commit/4f4033b4615ad9b71b8e4ee87a1bde5e1e324a47\n해당 커밋 소스: https://github.com/yuxa94/apartment-planner/tree/4f4033b4615ad9b71b8e4ee87a1bde5e1e324a47\n관련 커밋 833527c: https://github.com/yuxa94/apartment-planner/commit/833527cf7e31c1f3edd0690d02d52139d5ede437\n해당 커밋 소스: https://github.com/yuxa94/apartment-planner/tree/833527cf7e31c1f3edd0690d02d52139d5ede437\n위 소스는 기준 결과 비교용입니다. 새 기능을 만드는 실습에서는 현재 수업 코드를 수정하고, 막혔을 때만 기준 소스와 비교해 주세요.",
    "checks": [
      "선택한 실의 변·모서리 손잡이로 0.05 m 단위 조절이 된다.",
      "기본은 맞닿은 실의 경계도 같이 움직이고, Alt를 누르면 그 실만 바뀐다.",
      "레이어 순서를 바꾸면 보이는 면적이 다시 계산된다."
    ],
    "repair": "크기를 줄이다가 300 mm보다 작아지거나 외곽 밖으로 나가. 그런 경우엔 가장 가까운 가능한 위치에서 멈추게 해줘.",
    "note": "레이어 규칙으로 바꾸면서 기존 “겹침 금지” 테스트 2개를 새 규칙에 맞게 고쳤다. 테스트 44→45개. 데이터 의미를 바꾸는 요청은 테스트도 같이 바뀌어야 한다는 예로 쓴다.",
    "image": null,
    "visual": null,
    "links": [],
    "explain": [
      [
        "크기 조절",
        "변 4개·모서리 4개 손잡이입니다. 끄는 동안 mm 치수와 면적이 표시됩니다."
      ],
      [
        "레이어",
        "별도 필드 없이 rooms 배열 순서가 곧 위아래 순서입니다."
      ],
      [
        "점유",
        "겹침이 오류가 아니라 위 레이어가 차지한 면적이 됩니다. L자 거실도 사각형 두 개로 만들 수 있습니다."
      ]
    ],
    "kind": "lab",
    "part": "03 · 편집감 다듬기",
    "time": "58–64분",
    "title": "3A · 실 크기 조절과 레이어",
    "lead": "두 요청을 차례로 넣습니다. 두 번째 요청은 데이터 규칙 자체를 바꿉니다.",
    "gitRefs": [
      "4f4033b",
      "833527c"
    ],
    "originalSlide": 15
  },
  {
    "cards": [],
    "prompt": null,
    "checks": [],
    "repair": null,
    "note": "Claude에게도 같은 규칙을 지침으로 준다: 배열 뒤쪽이 위 레이어, 직사각형이 아닌 공간은 큰 사각형을 아래에 두고 다른 실로 덮어 만든다.",
    "image": null,
    "visual": "layers",
    "links": [],
    "explain": [],
    "kind": "diagram",
    "part": "03 · 편집감 다듬기",
    "time": "64–66분",
    "title": "겹침은 오류가 아니라 레이어입니다",
    "lead": "아래 큰 사각형을 위 실들이 덮으면 남는 부분이 L자 공간이 됩니다.",
    "gitRefs": [
      "833527c"
    ],
    "originalSlide": 16
  },
  {
    "cards": [],
    "prompt": "공간을 옮기거나 크기를 바꿀 때 가까운 변이나 꼭짓점에 스냅되면 좋겠어.\n\n[이 실습의 자료와 기준 결과]\n자료·에셋: https://yuxa94.github.io/apartment-planner/materials.html\n시작 소스: https://github.com/yuxa94/apartment-planner/tree/c878de6f48ad3e2220dc225b60301ef0ad4aa69f\n관련 커밋 3a5e6dc: https://github.com/yuxa94/apartment-planner/commit/3a5e6dce927c222f1e6541b9670880408b0c41ff\n해당 커밋 소스: https://github.com/yuxa94/apartment-planner/tree/3a5e6dce927c222f1e6541b9670880408b0c41ff\n위 소스는 기준 결과 비교용입니다. 새 기능을 만드는 실습에서는 현재 수업 코드를 수정하고, 막혔을 때만 기준 소스와 비교해 주세요.",
    "checks": [
      "약 10px 안의 다른 실 변·외곽 꼭짓점 선에 붙는다.",
      "붙을 때 분홍 점선 안내선이 보인다.",
      "Ctrl을 누르는 동안 스냅이 풀린다."
    ],
    "repair": "두 변에 동시에 붙는데 안내선이 하나만 보여. 맞은 모든 변에 안내선을 그려줘.",
    "note": "실제 기록: 침실 2의 왼쪽 변이 7.34→7.40 선에, 공용욕실이 10.26→10.15 선에 붙었다. 수정 후 Ctrl+Z로 원래대로 돌리고 커밋했다. 테스트 49개.",
    "image": null,
    "visual": null,
    "links": [],
    "explain": [
      [
        "가까운 변",
        "다른 실의 변을 무한선으로 보고 붙습니다."
      ],
      [
        "꼭짓점",
        "외곽 꼭짓점의 가로·세로 선에도 붙고, 둘 다 맞으면 점을 표시합니다."
      ],
      [
        "스냅이 없을 때",
        "이동은 0.1 m, 크기는 0.05 m 격자를 씁니다."
      ]
    ],
    "kind": "lab",
    "part": "03 · 편집감 다듬기",
    "time": "66–70분",
    "title": "3B · 가까운 변과 꼭짓점에 스냅",
    "lead": "CAD에서 익숙한 붙는 느낌을 넣습니다. 이 기능은 뒤에서 Stage 2에도 그대로 옮겨 갑니다.",
    "gitRefs": [
      "3a5e6dc"
    ],
    "originalSlide": 17
  },
  {
    "cards": [],
    "prompt": null,
    "checks": [],
    "repair": null,
    "note": "강사는 Stage 1이 막힌 수강생에게 package/planby-unit-planner.html을 열게 한다. 80분에 수색4 도면 화면으로 돌아온다.",
    "image": null,
    "visual": null,
    "links": [],
    "explain": [],
    "kind": "break",
    "part": "BREAK",
    "time": "70–80분",
    "title": "10분 쉬어갑니다",
    "lead": "이제 세대를 코어에 붙여 동평면을 만듭니다.",
    "gitRefs": [],
    "originalSlide": 18
  },
  {
    "cards": [],
    "prompt": null,
    "checks": [],
    "repair": null,
    "note": "사용자 첫 피드백: “지금 GPT가 만들어 놓은 배치 조합이 너무 별로여서 참고자료랑 대조하면서 보자.” v1 생성기는 세대 방향·현관 정보가 없고 임의 패턴 3종이었다. 101동과 106동(A-375)을 옆에 열고 문제를 표로 정리한 뒤 101동 재현부터 시작했다.",
    "image": "assets/susaek-101.png",
    "visual": null,
    "links": [
      [
        "해당 단계 앱 열기",
        "apps/stage2/index.html"
      ]
    ],
    "explain": [],
    "kind": "image",
    "part": "04 · 실제 동평면 재현하기",
    "time": "81–84분",
    "title": "수색4 101동 A-303 · 복도형 4세대 + 후면 코어",
    "lead": "자동 생성 전에 실제 동평면 하나를 그대로 재현해 규칙을 확인합니다.",
    "aside": "HAUD 참고도면 검토용 렌더링입니다(2019 사업시행변경인가 PDF 3쪽). 원본 도면은 수정하지 않았습니다.",
    "gitRefs": [
      "0cbd2e1"
    ],
    "originalSlide": 19
  },
  {
    "cards": [],
    "prompt": "수색4 101동(A-303, 복도형 4세대 + 후면 코어)을 그대로 재현하는 조합 규칙부터 만들어줘.\n도면의 치수열을 읽어서 세대 전면·깊이, 복도 폭, 코어 크기를 정하고, 도면과 생성 결과를 나란히 비교하는 카드를 보여줘.\n\n[이 실습의 자료와 기준 결과]\n자료·에셋: https://yuxa94.github.io/apartment-planner/materials.html\n시작 소스: https://github.com/yuxa94/apartment-planner/tree/f3a6e34053a273dd22798b1600bab54f7c8662df\n관련 커밋 0cbd2e1: https://github.com/yuxa94/apartment-planner/commit/0cbd2e16b5b5f4e2af87d28f3695b50ad90a2349\n해당 커밋 소스: https://github.com/yuxa94/apartment-planner/tree/0cbd2e16b5b5f4e2af87d28f3695b50ad90a2349\n위 소스는 기준 결과 비교용입니다. 새 기능을 만드는 실습에서는 현재 수업 코드를 수정하고, 막혔을 때만 기준 소스와 비교해 주세요.",
    "checks": [
      "비교 카드에 도면 값과 생성 값이 나란히 있다.",
      "동 폭·깊이 차이가 mm 단위로 표시된다.",
      "치수의 출처(도면 이미지 판독 / 가정)가 구분돼 있다."
    ],
    "repair": "세대 현관이 복도 반대쪽에 붙었어. 현관은 복도 쪽 변에, 코어는 복도 뒤에 두도록 규칙을 고쳐줘.",
    "note": "중간에 어시스턴트가 “LH 세대 방향이 90° 틀렸다”고 했다가 스스로 정정했다. LH 59A는 전면 12.9m의 4베이라 현재 방향이 맞다. 그럴듯한 설명도 도면과 대조해 확인해야 한다는 사례로 쓴다.",
    "image": null,
    "visual": null,
    "links": [],
    "explain": [
      [
        "그대로 재현",
        "새 조합을 만들기 전에 실제 사례 하나를 맞춰 보면 규칙이 맞는지 확인할 수 있습니다."
      ],
      [
        "치수열",
        "PDF 도면에 적힌 치수 문자열입니다. DWG에서 뽑은 값이 아니라 이미지에서 읽은 값입니다."
      ],
      [
        "비교 카드",
        "도면 값과 생성 값의 차이를 숫자로 보여 줘야 “비슷해 보인다”에서 벗어날 수 있습니다."
      ]
    ],
    "kind": "lab",
    "part": "04 · 실제 동평면 재현하기",
    "time": "84–96분",
    "title": "4 · 참고 동평면을 그대로 재현하기",
    "lead": "Stage 2 세션(course-stage2)에 입력합니다.",
    "gitRefs": [
      "0cbd2e1"
    ],
    "originalSlide": 20
  },
  {
    "cards": [
      [
        "동 폭",
        "20.080 m → 20.080 m"
      ],
      [
        "동 깊이",
        "15.860 m → 15.861 m (1 mm)"
      ],
      [
        "세대",
        "39㎡ × 4 · 전면 5.02 m · 깊이 10.385 m → 같은 치수로 배치"
      ],
      [
        "복도 · 코어",
        "복도 2.056 m · 코어 9.43 × 3.42 m → 계단 4.88 · 홀 2.0 · 승강기 2.55 · 설비 0.62 m"
      ],
      [
        "가정",
        "현관 좌우 위치는 도면 판단 · 문 폭 1.0 m → 가정으로 표시"
      ]
    ],
    "prompt": null,
    "checks": [],
    "repair": null,
    "note": "커밋 0cbd2e1. 이 뒤 “더 여러 조합으로”라는 요청에 편복도 조합 75안을 만들었지만, 사용자가 의도와 다르다고 해서 커밋 전에 되돌렸다. 화면을 먼저 보고 커밋하는 습관이 이런 경우를 막는다.",
    "image": null,
    "visual": null,
    "links": [
      [
        "전체 참고도면 PDF는 강사 별도 준비 · 자료 안내",
        "#resources"
      ]
    ],
    "explain": [],
    "kind": "table",
    "part": "04 · 실제 동평면 재현하기",
    "time": "96–100분",
    "title": "재현 결과 · 도면과 생성값",
    "lead": "동 외곽은 1 mm 안에서 맞았습니다. 내부 구간은 도면 판독값과 가정이 섞여 있습니다.",
    "gitRefs": [
      "0cbd2e1"
    ],
    "originalSlide": 21
  },
  {
    "cards": [],
    "prompt": null,
    "checks": [],
    "repair": null,
    "note": "사용자가 면적표 이미지를 첨부하며 “코어 1개에 유닛을 붙일 수 있는 경우의 수를 탐색하는 거였어”라고 방향을 바로잡았다. Stage 1의 unit-59/74/84.json을 받아 실제 외곽과 현관 위치로 조합한다. 외곽 면적이 Stage 1과 정확히 같다(102.54 / 120.65 / 140.651㎡).",
    "image": "assets/b-cands.png",
    "visual": null,
    "links": [
      [
        "해당 단계 앱 열기",
        "apps/stage2/index.html"
      ]
    ],
    "explain": [],
    "kind": "image",
    "part": "05 · 코어 1개와 세대 조합 탐색",
    "time": "100–104분",
    "title": "코어 1개에 세대를 붙이는 경우의 수",
    "lead": "Stage 1이 저장한 59·74·84 평면을 코어 네 면에 붙여 겹치지 않는 조합만 남깁니다.",
    "aside": "25층 기준 기본 화면입니다. 그룹마다 승강기·계단 규칙과 후보 수가 붙습니다.",
    "gitRefs": [
      "7a54467"
    ],
    "originalSlide": 22
  },
  {
    "cards": [],
    "prompt": "내가 말한 배치는 코어 1개에 유닛을 붙일 수 있는 경우의 수를 탐색하는 거야.\nunit-plans의 59·74·84 평면 3개로, 현관이 코어 면에 닿고 서로 겹치지 않는 조합을 찾아서 2·3·4세대 코어로 묶어 보여줘.\n좌우 대칭이거나 위치만 조금 다른 안은 하나로 합쳐줘.\n\n[이 실습의 자료와 기준 결과]\n자료·에셋: https://yuxa94.github.io/apartment-planner/materials.html\n시작 소스: https://github.com/yuxa94/apartment-planner/tree/f3a6e34053a273dd22798b1600bab54f7c8662df\n관련 커밋 7a54467: https://github.com/yuxa94/apartment-planner/commit/7a544673fdd7f75140315962a08ed49c7f901cd0\n해당 커밋 소스: https://github.com/yuxa94/apartment-planner/tree/7a544673fdd7f75140315962a08ed49c7f901cd0\n위 소스는 기준 결과 비교용입니다. 새 기능을 만드는 실습에서는 현재 수업 코드를 수정하고, 막혔을 때만 기준 소스와 비교해 주세요.",
    "checks": [
      "2·3·4세대 그룹별 후보 수가 나온다.",
      "후보 카드에 전용 합계, 공용 면적, 향이 표시된다.",
      "탈락 사유별 개수(겹침, 빈틈 없음 등)가 보인다."
    ],
    "repair": "세대 외곽이 Stage 1 평면과 달라. unit-plans JSON의 outline과 현관 위치를 그대로 쓰고, 면적이 Stage 1과 같은지 확인해줘.",
    "note": "첫 결과 4세대 21안, 3세대 54안, 2세대 51안(가정 홈 치수). JSON 연동 후 4세대 11안, 3세대 53안, 2세대 48안. 세대 외곽 해석 차이(84형 14.9×10.57 대 13.8×9.4)는 공유 노트로 Stage 1에 알렸다.",
    "image": null,
    "visual": null,
    "links": [],
    "explain": [
      [
        "경우의 수",
        "네 면 × 세대 종류 × 반전을 모두 시도하고 규칙에 맞는 것만 남깁니다."
      ],
      [
        "현관이 코어 면에",
        "세대마다 현관 앞 오목한 부분에 코어가 들어가야 연결됩니다."
      ],
      [
        "하나로 합쳐",
        "대칭·미세 이동 중복을 지워야 비교할 만한 수로 줄어듭니다."
      ]
    ],
    "kind": "lab",
    "part": "05 · 코어 1개와 세대 조합 탐색",
    "time": "104–114분",
    "title": "5A · 코어 1개 + 세대 경우의 수",
    "lead": "Stage 1의 unit-plans/*.json 세 파일을 함께 넘깁니다.",
    "gitRefs": [
      "7a54467"
    ],
    "originalSlide": 23
  },
  {
    "cards": [],
    "prompt": "계단, 엘리베이터, 복도를 코어를 만들 때 유동적으로 바꾸고 싶어. 판상형, 타워형, ㄴ자, Y자 같은 형태까지 고려하면 어떤 식으로 개발하면 좋을지 리서치해서 알려줘.\n(답을 본 뒤) 지금 작업 커밋하고, 1단계 코어 부품화부터 진행해줘.\n\n[이 실습의 자료와 기준 결과]\n자료·에셋: https://yuxa94.github.io/apartment-planner/materials.html\n시작 소스: https://github.com/yuxa94/apartment-planner/tree/f3a6e34053a273dd22798b1600bab54f7c8662df\n관련 커밋 ea29484: https://github.com/yuxa94/apartment-planner/commit/ea29484646c72cc56c603e3b09dcfdadde6e0af1\n해당 커밋 소스: https://github.com/yuxa94/apartment-planner/tree/ea29484646c72cc56c603e3b09dcfdadde6e0af1\n위 소스는 기준 결과 비교용입니다. 새 기능을 만드는 실습에서는 현재 수업 코드를 수정하고, 막혔을 때만 기준 소스와 비교해 주세요.",
    "checks": [
      "층수·코어당 세대 수로 승강기 대수·인승이 정해진다.",
      "16층 이상이면 부속실이 있는 특별피난계단이 들어간다.",
      "규칙 근거 조문이 그룹 머리에 표시된다(선별 계산)."
    ],
    "repair": "25층 4세대 코어가 110㎡로 너무 커. 홀이 현관에 닿는 최소 형태를 고르고, 공용면적이 가장 작은 배치를 남겨줘.",
    "note": "25층 기준 4세대 15인승 2대, 3세대 13인승 2대, 2세대 15인승 1대. 31m 초과 시 비상용승강기. 모두 선별 계산이며 법규 적합 판정이 아니다. 커밋 7a54467(탐색), ea29484(부품화).",
    "image": null,
    "visual": null,
    "links": [],
    "explain": [
      [
        "리서치",
        "승강기 대수(주택건설기준 규칙 제4조), 특별피난계단(시행령 제35조), TestFit·Finch 같은 도구 방식을 조사했습니다."
      ],
      [
        "1단계만",
        "4단계 로드맵 중 첫 단계만 구현해 화면을 보고 다음을 정합니다."
      ],
      [
        "부품",
        "계단실·부속실·승강기·샤프트·홀을 따로 놓고 조립합니다. 치수는 계획 가정입니다."
      ]
    ],
    "kind": "lab",
    "part": "05 · 코어 1개와 세대 조합 탐색",
    "time": "114–120분",
    "title": "5B · 층수에 따라 코어를 부품으로 조립",
    "lead": "먼저 리서치를 맡기고, 로드맵의 1단계만 구현합니다.",
    "gitRefs": [
      "ea29484"
    ],
    "originalSlide": 24
  },
  {
    "cards": [],
    "prompt": "인천계양1 core 폴더의 코어 DWG 6개를 AutoCAD MCP로 읽어줘. 원본은 수정하지 마.\n도면의 계단·승강기·샤프트 블록은 그대로 쓰고, 홀과 복도는 세대에 맞게 유동적으로 생기게 해줘.\n53A와 101·103·104동 코어도 같은 방식으로 추가해줘.\n\n[이 실습의 자료와 기준 결과]\n자료·에셋: https://yuxa94.github.io/apartment-planner/materials.html\n시작 소스: https://github.com/yuxa94/apartment-planner/tree/f3a6e34053a273dd22798b1600bab54f7c8662df\n관련 커밋 217e190: https://github.com/yuxa94/apartment-planner/commit/217e19020cc851dc9102e9d21e598b0497f6e7d6\n해당 커밋 소스: https://github.com/yuxa94/apartment-planner/tree/217e19020cc851dc9102e9d21e598b0497f6e7d6\n위 소스는 기준 결과 비교용입니다. 새 기능을 만드는 실습에서는 현재 수업 코드를 수정하고, 막혔을 때만 기준 소스와 비교해 주세요.",
    "checks": [
      "코어 6개의 외곽 크기와 부품 목록이 나왔다.",
      "원본 DWG가 바뀌지 않았다(읽기 전용).",
      "코어 선택에서 계양 코어를 고르면 후보가 다시 생성된다."
    ],
    "repair": "MCP 명령이 처음 열린 도면에서만 실행돼. 대상 도면 탭을 활성화하고 dispatcher를 다시 로드했으니, 한글 파일명이면 영문 복사본을 만들어 읽기 전용으로 읽어줘.",
    "note": "실제 기록: 사용자가 “로드완료”, “core-59A.dwg 탭을 활성화하고 mcp_dispatch.lsp를 다시 로드했어”라고 두 번 알려 줬다. 결과 59A 6.0×8.2m, 84A 7.5×7.9m, 53A 9.6×9.7m, 101/103/104동 15~19×14~15m 타워형. 59A·84A에서 계단실과 샤프트가 0.25m 겹친 판독 실수를 테스트가 잡았다. 추출 기록은 tmp/core-extract-20261015/.",
    "image": null,
    "visual": null,
    "links": [],
    "explain": [
      [
        "AutoCAD MCP",
        "Claude가 열린 AutoCAD 도면을 조회하는 도구입니다. LISP dispatcher가 도면마다 따로 로드돼야 합니다."
      ],
      [
        "원본은 수정하지 마",
        "참고도면 보존 원칙입니다. ObjectDBX로 도면을 열지 않고 읽었습니다."
      ],
      [
        "블록은 그대로",
        "계단·승강기·샤프트는 고정, 홀·복도만 세대에 맞춰 생성합니다."
      ]
    ],
    "kind": "lab",
    "part": "06 · CAD 코어 읽고 세대 먼저 조립",
    "time": "120–130분",
    "title": "6A · AutoCAD MCP로 실제 코어 DWG 읽기",
    "lead": "가정 치수 대신 인천계양1 기준층 코어 6개를 읽어 블록으로 씁니다. AutoCAD에서 dispatcher를 로드해 둡니다.",
    "gitRefs": [
      "217e190"
    ],
    "originalSlide": 25
  },
  {
    "cards": [],
    "prompt": null,
    "checks": [],
    "repair": null,
    "note": "사용자 요청: “테트리스 할 때 쓰는 로직처럼 실들을 붙여서 배치하고 그 사이에 코어를 넣는 형식으로.” 세대를 벽끼리 2m 이상 맞붙이고, 거실 앞 6m 안에 다른 세대가 들어오면 버린다. 현관 앞 1.5m를 비우고 폭 1.8m 복도 띠로 현관을 잇는다. 이후 화면 문구에서 “테트리스”는 지웠다.",
    "image": null,
    "visual": "unitfirst",
    "links": [],
    "explain": [],
    "kind": "diagram",
    "part": "06 · CAD 코어 읽고 세대 먼저 조립",
    "time": "130–134분",
    "title": "코어 먼저 → 세대 먼저",
    "lead": "코어를 먼저 놓으면 늘 정사각형 덩어리가 됩니다. 순서를 뒤집어 세대를 맞붙인 뒤 빈틈에 코어를 넣습니다.",
    "gitRefs": [
      "217e190"
    ],
    "originalSlide": 26
  },
  {
    "cards": [],
    "prompt": "지금 코어가 그대로 정사각형인 것 같아. 세대들을 먼저 맞붙여 배치하고, 현관 앞을 이어 홀을 만든 뒤 그 사이에 계단·승강기·샤프트를 넣는 방식으로 바꿔줘.\n(결과를 본 뒤) 커밋하고, 4세대 조합이 나오게 하고 3세대 홀이 너무 커지는 문제를 개선해줘.\n\n[이 실습의 자료와 기준 결과]\n자료·에셋: https://yuxa94.github.io/apartment-planner/materials.html\n시작 소스: https://github.com/yuxa94/apartment-planner/tree/f3a6e34053a273dd22798b1600bab54f7c8662df\n관련 커밋 217e190: https://github.com/yuxa94/apartment-planner/commit/217e19020cc851dc9102e9d21e598b0497f6e7d6\n해당 커밋 소스: https://github.com/yuxa94/apartment-planner/tree/217e19020cc851dc9102e9d21e598b0497f6e7d6\n관련 커밋 54b3670: https://github.com/yuxa94/apartment-planner/commit/54b3670966337d4eafa2d1fd129d22f55ddb0566\n해당 커밋 소스: https://github.com/yuxa94/apartment-planner/tree/54b3670966337d4eafa2d1fd129d22f55ddb0566\n위 소스는 기준 결과 비교용입니다. 새 기능을 만드는 실습에서는 현재 수업 코드를 수정하고, 막혔을 때만 기준 소스와 비교해 주세요.",
    "checks": [
      "조합 방식에 “세대 먼저 맞붙이고 빈틈에 코어 배치”가 있다.",
      "4세대 후보가 0안이 아니다.",
      "3세대 공용면적이 이전(81~91㎡)보다 줄었다."
    ],
    "repair": "홀이 끊겨 있는데 연결됐다고 나와. 각 현관 앞 공간을 연결된 것으로 미리 처리하지 말고, 실제로 이어진 복도만 연결로 판정해줘.",
    "note": "개선 후 2세대 129안(공용 40/49㎡), 3세대 135안(53/56㎡), 4세대 21안(70/72㎡). 계산 약 3초, 같은 조건이면 캐시. 남은 문제: 일부 조합에서 계단이 건물 밖으로 튀어나온다. 커밋 217e190, 54b3670.",
    "image": null,
    "visual": null,
    "links": [],
    "explain": [
      [
        "맞붙여",
        "세대를 4방향·반전으로 돌려 벽끼리 붙입니다."
      ],
      [
        "홀이 너무 커지는",
        "현관 두 곳을 감싸는 상자 전체를 홀로 잡은 것이 원인이었습니다."
      ],
      [
        "개선",
        "중앙에 가까운 현관부터 직선·ㄱ자 중 면적이 작은 복도 띠로 잇습니다."
      ]
    ],
    "kind": "lab",
    "part": "06 · CAD 코어 읽고 세대 먼저 조립",
    "time": "134–140분",
    "title": "6B · 세대 먼저 맞붙이고 빈틈에 코어",
    "lead": "첫 결과에서 4세대가 0안이었습니다. 원인을 찾아 고치는 요청까지 이어서 넣습니다.",
    "gitRefs": [
      "217e190",
      "54b3670"
    ],
    "originalSlide": 27
  },
  {
    "cards": [],
    "prompt": null,
    "checks": [],
    "repair": null,
    "note": "요청 순서: 향 필터 3분리와 창 방향 표시 → 저장한 안 편집 탭 → 코어 부품 바운딩박스 크기·회전 → “90도 회전만 된다, 자유롭게” → Stage 1의 스냅·외곽 push/pull 이식 → 문·창 이동·삭제. “회전이 안 된다”는 피드백은 데이터는 돌았지만 정사각형 승강기가 화면상 같아 보였던 것이라, 승강기 문과 계단 화살표를 그려 해결했다.",
    "image": "assets/b-edit.png",
    "visual": null,
    "links": [
      [
        "해당 단계 앱 열기",
        "apps/stage2/index.html"
      ]
    ],
    "explain": [],
    "kind": "image",
    "part": "07 · 저장한 안 편집과 JSON",
    "time": "140–143분",
    "title": "저장한 안 편집 탭",
    "lead": "후보를 저장한 뒤 세대 이동·자유 회전·반전, 코어 부품 크기 조절·그리기·삭제를 손으로 합니다.",
    "aside": "편집 중에도 겹침·현관 연결·계단·승강기 검사가 실시간으로 다시 계산됩니다.",
    "gitRefs": [
      "54b3670",
      "a90843b",
      "3b7a0b6"
    ],
    "originalSlide": 28
  },
  {
    "cards": [],
    "prompt": "각 후보들을 JSON으로 저장할 수 있게 해줘.\n저장한 안은 다른 탭에서 수동으로 고칠 수 있게 하고, Stage 1의 편집·스냅 기능을 참고해서 세대 외곽선을 밀고 당기거나 창문과 문 위치를 옮기고 삭제할 수 있게 해줘.\n\n[이 실습의 자료와 기준 결과]\n자료·에셋: https://yuxa94.github.io/apartment-planner/materials.html\n시작 소스: https://github.com/yuxa94/apartment-planner/tree/f3a6e34053a273dd22798b1600bab54f7c8662df\n관련 커밋 54b3670: https://github.com/yuxa94/apartment-planner/commit/54b3670966337d4eafa2d1fd129d22f55ddb0566\n해당 커밋 소스: https://github.com/yuxa94/apartment-planner/tree/54b3670966337d4eafa2d1fd129d22f55ddb0566\n관련 커밋 a90843b: https://github.com/yuxa94/apartment-planner/commit/a90843bb03acdcef381bbc0010a922c3ffc82fdd\n해당 커밋 소스: https://github.com/yuxa94/apartment-planner/tree/a90843bb03acdcef381bbc0010a922c3ffc82fdd\n관련 커밋 3b7a0b6: https://github.com/yuxa94/apartment-planner/commit/3b7a0b6abbec63f7c2c33285c936c79515f0b5db\n해당 커밋 소스: https://github.com/yuxa94/apartment-planner/tree/3b7a0b6abbec63f7c2c33285c936c79515f0b5db\n위 소스는 기준 결과 비교용입니다. 새 기능을 만드는 실습에서는 현재 수업 코드를 수정하고, 막혔을 때만 기준 소스와 비교해 주세요.",
    "checks": [
      "후보 카드마다 “JSON ↓”가 있고 형식이 apartment-planner-building/1이다.",
      "저장한 안을 편집 탭에서 열 수 있다.",
      "외곽 벽을 당기면 붙은 실과 창·문이 같이 움직인다."
    ],
    "repair": "편집기에서 Ctrl+Z를 눌렀더니 앱 전체 실행 취소로 넘어가서 방금 저장한 후보가 사라졌어. 편집기 안에서는 키 이벤트를 막아줘.",
    "note": "면적·창·향은 가져올 때 형상에서 다시 계산하므로 형상만 고쳐 넣으면 된다. 84형 JSON의 안방이 원래 외곽 밖으로 조금 나와 있어 생긴 오탐은 “편집 시작 때보다 더 나간 경우만 표시”로 고쳤다. 테스트 62→63개.",
    "image": null,
    "visual": null,
    "links": [],
    "explain": [
      [
        "JSON으로 저장",
        "세대 외곽, 실, 현관, 창, 코어 부품과 만든 조건(settings)이 들어갑니다."
      ],
      [
        "다른 탭",
        "탐색 화면과 편집 화면을 나눠 탐색 결과가 손 편집으로 바뀌지 않게 합니다."
      ],
      [
        "Stage 1 참고",
        "다른 브랜치의 기능을 “참고해서” 옮기면 조작감이 단계 사이에 통일됩니다."
      ]
    ],
    "kind": "lab",
    "part": "07 · 저장한 안 편집과 JSON",
    "time": "143–150분",
    "title": "7 · 후보를 JSON으로 저장하고 손으로 고치기",
    "lead": "다음 단계로 넘길 파일 형식을 여기서 정합니다. 스냅·문/창 편집·외곽 밀기/당기기는 3b7a0b6의 결과와 비교합니다.",
    "gitRefs": [
      "54b3670",
      "a90843b",
      "3b7a0b6"
    ],
    "originalSlide": 29
  },
  {
    "cards": [],
    "prompt": null,
    "checks": [],
    "repair": null,
    "note": "Stage 2 후보 JSON 하나를 저장해 두게 한다(10A 실습에서 사용). 160분에 인동거리 비교표로 돌아온다.",
    "image": null,
    "visual": null,
    "links": [],
    "explain": [],
    "kind": "break",
    "part": "BREAK",
    "time": "150–160분",
    "title": "두 번째 휴식 · 10분",
    "lead": "이제 동을 대지에 놓고 인동거리와 높이를 검토합니다.",
    "gitRefs": [],
    "originalSlide": 30
  },
  {
    "cards": [
      [
        "측벽 ↔ 측벽",
        "0.5H = 34.8 m 요구 → 4 m (과하게 엄격)"
      ],
      [
        "채광면 ↔ 남측 저층",
        "0.5H = 29 m 요구, 충족 → 51.25 m 요구, 미충족 (판정이 반대)"
      ],
      [
        "대각 배치",
        "같은 계수 → 단순 규칙으로 폴백, “대각·단순 가정” 표시"
      ],
      [
        "후보 격자",
        "판정과 별도 계산 → canPlace가 같은 판정 함수를 사용"
      ]
    ],
    "prompt": null,
    "checks": [],
    "repair": null,
    "note": "사용자 요청: “실제 동배치도 레퍼런스를 보면 인동거리나 일조사선 검토를 하고 있는데 레퍼런스처럼 할 수 있어야 해. API 키 없이 너랑 대화하면서 어느 정도까지 되는지 검토하고 싶어.” 코드를 바꾸기 전에 대화만으로 101-103동을 계산해 앱 판정이 반대로 나온다는 것을 먼저 보였다. 수치는 예시 대지·사용자 가정 기준.",
    "image": null,
    "visual": null,
    "links": [],
    "explain": [],
    "kind": "table",
    "part": "08 · 면 구분 인동거리와 높이 산식",
    "time": "161–164분",
    "title": "단순 0.5H가 틀린 두 경우",
    "lead": "모든 면에 같은 계수를 쓰던 v1 규칙과, 마주보는 면을 구분한 규칙을 같은 배치에서 비교했습니다.",
    "gitRefs": [
      "26022ec",
      "0136f32"
    ],
    "originalSlide": 31
  },
  {
    "cards": [],
    "prompt": null,
    "checks": [],
    "repair": null,
    "note": "청주시 조례 프리셋 기준 예: 채광면↔채광면 1.0H, 남측 저층은 10m 이상이며 낮은 동 1.0H, 측벽↔측벽 4m. Stage 2에서 가져온 동은 실제 창이 놓인 면을 채광면으로, 창이 없는 면을 측벽으로 판정한다.",
    "image": null,
    "visual": "facing",
    "links": [],
    "explain": [],
    "kind": "diagram",
    "part": "08 · 면 구분 인동거리와 높이 산식",
    "time": "164–167분",
    "title": "창이 있는 면과 측벽을 나눠 봅니다",
    "lead": "거리선은 최근접점 연결이 아니라 마주보는 면 사이의 수직 치수선입니다.",
    "gitRefs": [
      "26022ec",
      "0136f32"
    ],
    "originalSlide": 32
  },
  {
    "cards": [],
    "prompt": "면 구분 인동거리와 높이 산정식을 engine.js에 규칙 프로필로 넣고 화면 거리선에도 근거를 표시해줘.\n공통 모듈 변경이니 계약 변경점을 먼저 정리해서 보여줘.\n(계약안을 본 뒤) 계약안대로 구현해줘. 대각 배치는 기존 단순 규칙으로 폴백하는 걸로 해.\n\n[이 실습의 자료와 기준 결과]\n자료·에셋: https://yuxa94.github.io/apartment-planner/materials.html\n시작 소스: https://github.com/yuxa94/apartment-planner/tree/a3b2e9f2f25bba58a1c90d19abfba73cb7be8b89\n관련 커밋 26022ec: https://github.com/yuxa94/apartment-planner/commit/26022ec002ac0bba491a4d0bc81dfd1a7b4a93b2\n해당 커밋 소스: https://github.com/yuxa94/apartment-planner/tree/26022ec002ac0bba491a4d0bc81dfd1a7b4a93b2\n관련 커밋 0136f32: https://github.com/yuxa94/apartment-planner/commit/0136f32c8e7aae1533f05f97a9ee66eac858bfdc\n해당 커밋 소스: https://github.com/yuxa94/apartment-planner/tree/0136f32c8e7aae1533f05f97a9ee66eac858bfdc\n위 소스는 기준 결과 비교용입니다. 새 기능을 만드는 실습에서는 현재 수업 코드를 수정하고, 막혔을 때만 기준 소스와 비교해 주세요.",
    "checks": [
      "구현 전에 추가 필드(rules.height, rules.profile, 쌍별 basis)가 정리됐다.",
      "기존 프로젝트 JSON이 그대로 열린다(선택 필드).",
      "거리선 라벨에 “실제 / 요구”와 근거 줄이 붙는다."
    ],
    "repair": "남측 저층 판정이 현행 조문과 달라. 낮은 동이 남쪽 반원에 있고 높은 동의 채광면이 그쪽을 향할 때만 적용되게 고쳐줘.",
    "note": "첫 요청 “거리선 라벨에 실제/요구값을 같이 보여주고 미충족이면 빨갛게”가 26022ec. 계약 문서는 공유 메모 폴더에 남겨 Stage 1·2가 병합에 대비하게 했다. 테스트 35→45개, 커밋 0136f32.",
    "image": null,
    "visual": null,
    "links": [],
    "explain": [
      [
        "규칙 프로필",
        "uniform(기존)과 facing(면 구분)을 고를 수 있습니다. 기본값은 기존 동작입니다."
      ],
      [
        "계약 변경점을 먼저",
        "세 단계가 공유하는 엔진이라 다른 세션이 알아야 할 변경을 문서로 먼저 받습니다."
      ],
      [
        "폴백",
        "면을 판단하기 애매한 대각 배치는 단순 규칙으로 계산하고 그렇게 표시합니다."
      ]
    ],
    "kind": "lab",
    "part": "08 · 면 구분 인동거리와 높이 산식",
    "time": "167–177분",
    "title": "8 · 계약안을 먼저 받고 구현하기",
    "lead": "Stage 3 세션(course-stage3)에 입력합니다. 공통 모듈을 바꾸는 요청은 두 번에 나눕니다.",
    "gitRefs": [
      "26022ec",
      "0136f32"
    ],
    "originalSlide": 33
  },
  {
    "cards": [],
    "prompt": null,
    "checks": [],
    "repair": null,
    "note": "AG-109: 1층 3.5 + (층수−3)×기준층고 + 3.0 + 3.0 + 파라펫 0.4. 1층 전체 필로티 동은 1층을 높이에서 뺀다. 도면 표의 15층 값(43,500 / 43,300 / 40,000 / 39,800)과 20·29층 값을 맞췄다. 삼송 산식은 0.6 + 층수×2.8 + 0.25(15층 42.85m). 높이가 바뀌면 정북 이격 요구값도 함께 바뀐다.",
    "image": null,
    "visual": "height",
    "links": [],
    "explain": [],
    "kind": "diagram",
    "part": "08 · 면 구분 인동거리와 높이 산식",
    "time": "177–180분",
    "title": "높이 H는 산식으로 정합니다",
    "lead": "청주월명 AG-109 도면의 층별 높이표를 그대로 재현하는 산식을 테스트로 고정했습니다.",
    "gitRefs": [
      "0136f32"
    ],
    "originalSlide": 34
  },
  {
    "cards": [],
    "prompt": null,
    "checks": [],
    "repair": null,
    "note": "사용자가 실제 인동거리배치도 스크린샷을 첨부하며 “이런 식으로 볼 수 있으면 좋겠다, 스크린샷의 법령 기준을 추가하고 더 추가할 게 있으면 찾아서 추가해줘”라고 요청했다. 가능 영역은 법정 연속 허용 영역이 아니라 1~5m 간격으로 검사한 위치다.",
    "image": "assets/s-drawing.png",
    "visual": null,
    "links": [
      [
        "해당 단계 앱 열기",
        "apps/stage3/index.html"
      ]
    ],
    "explain": [],
    "kind": "image",
    "part": "09 · 법령 프리셋 · 도면 보기 · 3D",
    "time": "180–184분",
    "title": "인동거리배치도 형식의 도면 보기",
    "lead": "대지경계 적색 일점쇄선, 건축한계선 청색 파선, mm 치수와 근거, 육각 동 태그, 기준 패널.",
    "aside": "예시 대지(실제 사업지 아님)에서 101동을 선택한 화면입니다. 초록 영역은 101동 중심을 옮겨도 현재 조건을 충족하는 위치입니다.",
    "gitRefs": [
      "be4b1a6"
    ],
    "originalSlide": 35
  },
  {
    "cards": [],
    "prompt": "첨부한 인동거리배치도처럼 볼 수 있는 도면 보기를 만들어줘.\n스크린샷에 있는 법령 기준을 프리셋으로 추가하고, 법령이나 기준으로 더 추가할 게 있으면 찾아서 추가해줘.\n조례는 바뀔 수 있으니 시행일과 원문 확인일을 화면에 같이 남겨줘.\n\n[이 실습의 자료와 기준 결과]\n자료·에셋: https://yuxa94.github.io/apartment-planner/materials.html\n시작 소스: https://github.com/yuxa94/apartment-planner/tree/a3b2e9f2f25bba58a1c90d19abfba73cb7be8b89\n관련 커밋 be4b1a6: https://github.com/yuxa94/apartment-planner/commit/be4b1a6fb1652b397ea8c926e11a135f954755bb\n해당 커밋 소스: https://github.com/yuxa94/apartment-planner/tree/be4b1a6fb1652b397ea8c926e11a135f954755bb\n위 소스는 기준 결과 비교용입니다. 새 기능을 만드는 실습에서는 현재 수업 코드를 수정하고, 막혔을 때만 기준 소스와 비교해 주세요.",
    "checks": [
      "검토 조건 설정에서 기준 프리셋을 고를 수 있다.",
      "프리셋마다 시행일·원문 확인일·링크가 있다.",
      "도면 보기에 치수와 “(기준 1.0H, 20F=…)” 근거가 붙는다.",
      "미검토 항목이 따로 표시된다."
    ],
    "repair": "스크린샷 도면은 2023년이라 정북 기준이 9 m인데 지금 조례와 달라. 현재 원문 기준으로 프리셋을 맞추고, 개정 이력을 노트에 남겨줘.",
    "note": "청주시 조례 제35조 정북 기준 높이는 2023-12-22에 9m→10m로 바뀌었다. 첨부 도면(2023.08)은 개정 전이다. 과거 도면의 계수를 현재 기준으로 그대로 쓰지 않는다는 원칙의 실제 예. 커밋 be4b1a6, 테스트 58개.",
    "image": null,
    "visual": null,
    "links": [],
    "explain": [
      [
        "프리셋",
        "조례·시행령·참고도면의 계수를 이름 붙여 저장한 묶음입니다. 사용자 가정과 구분됩니다."
      ],
      [
        "찾아서 추가",
        "시행령 제86조의 채광방향 높이제한(경계까지 거리의 2배)처럼 빠진 항목을 원문에서 찾았습니다."
      ],
      [
        "확인일",
        "법령은 개정됩니다. 화면에 “원문 확인일 이후 재확인”을 늘 표시합니다."
      ]
    ],
    "kind": "lab",
    "part": "09 · 법령 프리셋 · 도면 보기 · 3D",
    "time": "184–194분",
    "title": "9A · 법령 프리셋과 도면 보기",
    "lead": "참고 배치도 스크린샷을 함께 첨부합니다.",
    "gitRefs": [
      "be4b1a6"
    ],
    "originalSlide": 36
  },
  {
    "cards": [
      [
        "건축법 시행령 제86조",
        "시행 2026-10-06. 정북 10 m 이하 1.5 m · 초과 0.5H, 채광방향 경계까지 거리의 2배, 채광면 0.5H, 남측 저층 10 m + 0.5H, 측벽 4 m."
      ],
      [
        "청주시 건축 조례 제35조",
        "시행 2026-04-10. 정북 10 m / 1.5 m / 0.5H, 채광면 1.0H, 남측 저층 10 m 이상 + 낮은 동 1.0H."
      ],
      [
        "고양삼송 A00-008",
        "2016 참고도면 값. 1.0H, 남측 저층 0.8H + 1.0H, 정북 9 m. 비교용이며 현재 기준이 아닙니다."
      ],
      [
        "미검토로 남긴 것",
        "부대·복리시설 1H, 창 없는 벽↔측벽 8 m, 일조 2시간 갈음, 도로 중심선 특례, 지반 고저차, 주차·소방·피난."
      ]
    ],
    "prompt": null,
    "checks": [],
    "repair": null,
    "note": "“supported_screen”은 선별 계산을 지원한다는 뜻이지 법규 통과가 아니다. 판정은 입력한 기준 프리셋에 따른 기하 검토라고 매번 밝힌다.",
    "image": null,
    "visual": null,
    "links": [],
    "explain": [],
    "kind": "cards",
    "part": "09 · 법령 프리셋 · 도면 보기 · 3D",
    "time": "194–197분",
    "title": "작업 당시 프리셋 · 적용 전 원문 확인",
    "lead": "2026-10-15 작업 기록에 저장된 계수입니다. 이 강의에서는 당시 구현 사례로 읽으며, 현행 법규 여부는 별도로 확인합니다.",
    "gitRefs": [
      "be4b1a6"
    ],
    "originalSlide": 37
  },
  {
    "cards": [],
    "prompt": null,
    "checks": [],
    "repair": null,
    "note": "SVG 축측 투영으로 만들어 오프라인 단일 파일 원칙을 지켰다. “회전할 때 줌이 바뀐다”는 피드백의 원인은 보이는 건물 크기로 뷰 범위를 매번 다시 잡은 것이었고, 대지와 최고 동 기준 고정 범위로 고쳤다. “좌우가 반대”라는 피드백은 한 줄 수정(eff3a32).",
    "image": "assets/s-3d.png",
    "visual": null,
    "links": [
      [
        "해당 단계 앱 열기",
        "apps/stage3/index.html"
      ]
    ],
    "explain": [],
    "kind": "image",
    "part": "09 · 법령 프리셋 · 도면 보기 · 3D",
    "time": "197–200분",
    "title": "외부 라이브러리 없는 3D 매스",
    "lead": "높이 산식의 H로 올린 매스에서 동 이동, 지붕 ⇕ 핸들로 층수 변경, 정북 일조사선 면과 인동거리를 봅니다.",
    "aside": "조작: 왼쪽 클릭 선택·이동 · 오른쪽(휠) 드래그 회전 · Shift+오른쪽 패닝 · 휠 확대.",
    "gitRefs": [
      "be4b1a6",
      "2f446b7",
      "eff3a32"
    ],
    "originalSlide": 38
  },
  {
    "cards": [],
    "prompt": "이런 형태로 이제 각 동에 대한 파일이 들어올 거야. 이 파일을 불러와서 대지에 놓을 수 있게 구조를 만들어줘.\n편집 탭은 없어도 될 것 같아. 3D에서도 정북·인동 관련해서 보고 수정할 수 있게 해줘.\n\n[이 실습의 자료와 기준 결과]\n자료·에셋: https://yuxa94.github.io/apartment-planner/materials.html\n시작 소스: https://github.com/yuxa94/apartment-planner/tree/a3b2e9f2f25bba58a1c90d19abfba73cb7be8b89\n관련 커밋 b98cc61: https://github.com/yuxa94/apartment-planner/commit/b98cc610d2b037d41ee09ab77f4494ff116fafed\n해당 커밋 소스: https://github.com/yuxa94/apartment-planner/tree/b98cc610d2b037d41ee09ab77f4494ff116fafed\n관련 커밋 4f03d8c: https://github.com/yuxa94/apartment-planner/commit/4f03d8c20e2843e03975a87049bdb88e2a05051a\n해당 커밋 소스: https://github.com/yuxa94/apartment-planner/tree/4f03d8c20e2843e03975a87049bdb88e2a05051a\n관련 커밋 2f446b7: https://github.com/yuxa94/apartment-planner/commit/2f446b72e2a1ddcfac4be1abca73142570db2415\n해당 커밋 소스: https://github.com/yuxa94/apartment-planner/tree/2f446b72e2a1ddcfac4be1abca73142570db2415\n위 소스는 기준 결과 비교용입니다. 새 기능을 만드는 실습에서는 현재 수업 코드를 수정하고, 막혔을 때만 기준 소스와 비교해 주세요.",
    "checks": [
      "불러오기로 후보와 층수를 고르면 대지 빈 위치에 놓인다.",
      "동 외곽이 세대+코어를 합친 다각형이다.",
      "창이 있는 면이 채광면, 없는 면이 측벽으로 판정된다.",
      "동 회전 핸들과 대지 경계 꼭짓점 편집을 직접 확인했다."
    ],
    "repair": "가져온 동의 면적이 파일 값(footprintArea)과 달라. 파일 값은 외접 사각형이니 실제 외곽 다각형 면적을 쓰고, 그 차이를 메모로 남겨줘.",
    "note": "예시 파일의 동 외곽은 20각형 401.95㎡, 파일의 footprintArea 635.97㎡는 외접 사각형이라 쓰지 않았다. 회귀 테스트용으로 fixtures/building-3u-59x2-74x1.json을 남겼다. 커밋 2f446b7, 테스트 67개. 동 회전 핸들 b98cc61, 대지 경계 편집 4f03d8c는 별도 커밋이며, 2f446b7의 동평면 가져오기에 앞선 기능이다.",
    "image": null,
    "visual": null,
    "links": [],
    "explain": [
      [
        "이런 형태",
        "Stage 2의 apartment-planner-building/1 파일입니다. 단계 사이 계약이 여기서 실제로 쓰입니다."
      ],
      [
        "구조",
        "엔진에 선택 필드 shape(세대 외곽·코어 부품·창, 동 중심 기준 로컬 좌표)를 더했습니다."
      ],
      [
        "수정",
        "가져온 동은 외곽·세대 수가 고정되고 위치·회전·층수·층고만 바뀝니다."
      ]
    ],
    "kind": "lab",
    "part": "10 · 동평면 가져와 배치안 만들기",
    "time": "200–208분",
    "title": "10A · Stage 2 동평면을 대지로 가져오기",
    "lead": "휴식 때 저장한 Stage 2 후보 JSON을 첨부합니다.",
    "gitRefs": [
      "b98cc61",
      "4f03d8c",
      "2f446b7"
    ],
    "originalSlide": 39
  },
  {
    "cards": [],
    "prompt": "지금 101동부터 105동까지 배치해 보려고 하는데, 모든 동이 현재 검토 조건을 충족하는 가능한 배치안을 만들어줘.\n거실이 서향이나 북향이 되는 회전은 빼줘.\n\n[이 실습의 자료와 기준 결과]\n자료·에셋: https://yuxa94.github.io/apartment-planner/materials.html\n시작 소스: https://github.com/yuxa94/apartment-planner/tree/a3b2e9f2f25bba58a1c90d19abfba73cb7be8b89\n관련 커밋 b98cc61: https://github.com/yuxa94/apartment-planner/commit/b98cc610d2b037d41ee09ab77f4494ff116fafed\n해당 커밋 소스: https://github.com/yuxa94/apartment-planner/tree/b98cc610d2b037d41ee09ab77f4494ff116fafed\n관련 커밋 4f03d8c: https://github.com/yuxa94/apartment-planner/commit/4f03d8c20e2843e03975a87049bdb88e2a05051a\n해당 커밋 소스: https://github.com/yuxa94/apartment-planner/tree/4f03d8c20e2843e03975a87049bdb88e2a05051a\n관련 커밋 2f446b7: https://github.com/yuxa94/apartment-planner/commit/2f446b72e2a1ddcfac4be1abca73142570db2415\n해당 커밋 소스: https://github.com/yuxa94/apartment-planner/tree/2f446b72e2a1ddcfac4be1abca73142570db2415\n위 소스는 기준 결과 비교용입니다. 새 기능을 만드는 실습에서는 현재 수업 코드를 수정하고, 막혔을 때만 기준 소스와 비교해 주세요.",
    "checks": [
      "안마다 동별 위치·회전·층수와 가장 빠듯한 조건의 여유(m)가 나온다.",
      "세대수·용적률 변화가 함께 정리된다.",
      "patch를 적용한 뒤 Ctrl+Z로 되돌릴 수 있다."
    ],
    "repair": "탐색 도중 내가 화면에서 층수를 바꿨어. 최신 개정 번호로 다시 계산하고, 개정 번호만 바꿔 적용하지는 마.",
    "note": "실제 결과: A안(정남향 5/15/15/350/15°, 여유 10.2m), B안(남동향 300~320°, 여유 8.4m). 둘 다 5개 동 충족, 153세대, 건폐율 6.0%, 용적률 76.6%. 탐색 중 105동이 3층이던 스냅샷이 섞여 rev 282 기준으로 다시 계산했다. 예시 대지·사용자 가정 수치.",
    "image": null,
    "visual": null,
    "links": [],
    "explain": [
      [
        "같은 엔진",
        "evaluateSite와 applyPatch를 그대로 써서 앱 판정과 대화 판정이 어긋나지 않습니다."
      ],
      [
        "배치안",
        "위치 0.5 m, 회전 5° 단위로 탐색했습니다."
      ],
      [
        "서향·북향 제외",
        "탐색 범위를 사람이 정해 주면 쓸모없는 안이 줄어듭니다."
      ]
    ],
    "kind": "lab",
    "part": "10 · 동평면 가져와 배치안 만들기",
    "time": "208–216분",
    "title": "10B · 조건을 충족하는 배치안 만들기",
    "lead": "Claude가 앱과 같은 엔진으로 위치·회전을 탐색해 patch로 돌려줍니다.",
    "gitRefs": [
      "b98cc61",
      "4f03d8c",
      "2f446b7"
    ],
    "originalSlide": 40
  },
  {
    "cards": [],
    "prompt": "배치안들을 버전별로 저장할 수 있게 해줘.\n그리고 네가 만든 배치안들도 새로운 버전으로 저장해 놔줘.\n\n[이 실습의 자료와 기준 결과]\n자료·에셋: https://yuxa94.github.io/apartment-planner/materials.html\n시작 소스: https://github.com/yuxa94/apartment-planner/tree/a3b2e9f2f25bba58a1c90d19abfba73cb7be8b89\n관련 커밋 2725a3f: https://github.com/yuxa94/apartment-planner/commit/2725a3f81459461b4c11b0337658d03287912e63\n해당 커밋 소스: https://github.com/yuxa94/apartment-planner/tree/2725a3f81459461b4c11b0337658d03287912e63\n위 소스는 기준 결과 비교용입니다. 새 기능을 만드는 실습에서는 현재 수업 코드를 수정하고, 막혔을 때만 기준 소스와 비교해 주세요.",
    "checks": [
      "왼쪽 “배치안 버전”에 이름·메모와 저장 시점 세대수·용적률·충족 여부가 보인다.",
      "버전을 누르면 그 배치로 바뀌고 Ctrl+Z가 된다.",
      "프로젝트 저장 JSON에 layouts가 들어간다."
    ],
    "repair": "버전을 불러왔더니 검토 조건까지 바뀌었어. 버전은 동 목록만 바꾸고 대지와 조건은 그대로 두게 해줘.",
    "note": "커밋 2725a3f, 테스트 68개. 버전은 프로젝트 JSON에 함께 들어가므로 파일 하나로 다른 PC나 아티팩트로 옮길 수 있다.",
    "image": null,
    "visual": null,
    "links": [],
    "explain": [
      [
        "버전별로",
        "project.layouts에 동 위치·회전·층수·형상을 저장합니다. 최대 30개입니다."
      ],
      [
        "네가 만든",
        "작업 중, 원래, A안, B안 네 개를 저장했습니다."
      ],
      [
        "비교",
        "세대수와 충족 여부를 목록에서 바로 비교합니다."
      ]
    ],
    "kind": "lab",
    "part": "10 · 동평면 가져와 배치안 만들기",
    "time": "216–220분",
    "title": "10C · 배치안을 버전으로 저장",
    "lead": "대화에서 만든 안과 손으로 고친 안을 나란히 비교할 수 있게 합니다.",
    "gitRefs": [
      "2725a3f"
    ],
    "originalSlide": 41
  },
  {
    "cards": [
      [
        "파일 하나로",
        "CSS·스크립트·세대 JSON을 넣은 단일 HTML. Stage 1 약 200KB, Stage 2 약 260KB, Stage 3 약 185KB. 참고도면 이미지(1.4MB)는 뺐습니다."
      ],
      [
        "다운로드가 막힘",
        "JSON은 화면의 텍스트 패널이나 내용 복사 창으로, Stage 3 아티팩트는 저장 확인 창(downloads 기능)으로 대신합니다."
      ],
      [
        "확인창이 막힘",
        "confirm() 대신 버튼을 한 번 더 누르면 실행되게 바꿨습니다. 일반 브라우저에도 같이 적용됩니다."
      ],
      [
        "저장소가 따로",
        "아티팩트는 로컬 앱과 저장 공간이 다릅니다. 프로젝트 JSON을 저장해 불러오기로 옮깁니다."
      ]
    ],
    "prompt": null,
    "checks": [],
    "repair": null,
    "note": "웹 채팅에 HTML을 첨부해 “아티팩트로 띄워줘”라고 하면 모델이 200KB 넘는 코드를 다시 써야 해서 잘리거나 실패하기 쉽다. Claude Code에서 파일을 그대로 게시하는 방식을 권한다. ChatGPT는 캔버스 대신 브라우저로 열고 JSON만 주고받는다.",
    "image": null,
    "visual": null,
    "links": [],
    "explain": [],
    "kind": "cards",
    "part": "11 · 패키징 · 배포와 정리",
    "time": "220–224분",
    "title": "대화 앱 화면의 제약과 대응",
    "lead": "세 단계 모두 HTML 파일 하나로 묶어 브라우저·Claude 아티팩트에서 열리게 했습니다.",
    "gitRefs": [
      "b718397",
      "5a57a08",
      "d9ff7d7",
      "b1aab09"
    ],
    "originalSlide": 42
  },
  {
    "cards": [],
    "prompt": "지금 결과를 단일 HTML로 빌드하고 브라우저에서 저장·불러오기를 확인한 뒤 커밋해줘. Stage 1/3은 기존 아티팩트 빌드를 참고하고, Stage 2의 미커밋 아티팩트 변경은 부록과 구분해서 설명해줘.\n\n[이 실습의 자료와 기준 결과]\n자료·에셋: https://yuxa94.github.io/apartment-planner/materials.html\n시작 소스: https://github.com/yuxa94/apartment-planner/tree/a3b2e9f2f25bba58a1c90d19abfba73cb7be8b89\n관련 커밋 b718397: https://github.com/yuxa94/apartment-planner/commit/b71839748501bea81de378373c7759588fc35ad3\n해당 커밋 소스: https://github.com/yuxa94/apartment-planner/tree/b71839748501bea81de378373c7759588fc35ad3\n관련 커밋 ae123eb: https://github.com/yuxa94/apartment-planner/commit/ae123ebfdab2257b3b568497f59c15913e57c210\n해당 커밋 소스: https://github.com/yuxa94/apartment-planner/tree/ae123ebfdab2257b3b568497f59c15913e57c210\n관련 커밋 5a57a08: https://github.com/yuxa94/apartment-planner/commit/5a57a088f16a403830e23599f48e16deef3c82a0\n해당 커밋 소스: https://github.com/yuxa94/apartment-planner/tree/5a57a088f16a403830e23599f48e16deef3c82a0\n관련 커밋 77e281f: https://github.com/yuxa94/apartment-planner/commit/77e281ff27905389f788d5946f66d3425bded959\n해당 커밋 소스: https://github.com/yuxa94/apartment-planner/tree/77e281ff27905389f788d5946f66d3425bded959\n관련 커밋 d9ff7d7: https://github.com/yuxa94/apartment-planner/commit/d9ff7d7617831d8f7c062dbcd0e69f48801f8261\n해당 커밋 소스: https://github.com/yuxa94/apartment-planner/tree/d9ff7d7617831d8f7c062dbcd0e69f48801f8261\n관련 커밋 b1aab09: https://github.com/yuxa94/apartment-planner/commit/b1aab092a422b3b30220e33dbc6a2ae6079d04aa\n해당 커밋 소스: https://github.com/yuxa94/apartment-planner/tree/b1aab092a422b3b30220e33dbc6a2ae6079d04aa\n위 소스는 기준 결과 비교용입니다. 새 기능을 만드는 실습에서는 현재 수업 코드를 수정하고, 막혔을 때만 기준 소스와 비교해 주세요.",
    "checks": [
      "빌드 스크립트(tools/…)로 단일 HTML이 다시 만들어진다.",
      "모델에 붙여 넣을 지침(MODEL-INSTRUCTIONS.md / LLM-지침.md)이 있다.",
      "아티팩트에서 열고, 저장이 막힌 곳은 복사 창으로 대신된다."
    ],
    "repair": "아티팩트에서 “프로젝트 저장”을 눌러도 아무 반응이 없어. 다운로드가 막힌 화면이면 내용 복사 창을 띄우고, 실제로 저장됐을 때만 “저장됨”을 표시해줘.",
    "note": "커밋 기준: Stage 1 b718397·ae123eb, Stage 2 5a57a08·77e281f, Stage 3 d9ff7d7·b1aab09. Stage 2의 아티팩트 빌드 추가는 미커밋이므로 별도 부록에 표시한다. 수업의 배포 앱은 이 최종 커밋들에 맞춘다.",
    "image": null,
    "visual": null,
    "links": [],
    "explain": [
      [
        "패키지",
        "HTML 하나 + 사용법 README + 모델 지침입니다. 서버·설치·API 키가 필요 없습니다."
      ],
      [
        "커밋",
        "빌드 결과물도 커밋해 다른 사람이 바로 열 수 있게 합니다."
      ],
      [
        "나만 보기",
        "아티팩트는 비공개로 시작합니다. 공유 여부는 사람이 정합니다."
      ]
    ],
    "kind": "lab",
    "part": "11 · 패키징 · 배포와 정리",
    "time": "224–232분",
    "title": "11 · 단일 HTML 패키지와 아티팩트 게시",
    "lead": "세 세션에 같은 문장을 넣었습니다. 단계마다 결과 파일 이름만 다릅니다.",
    "gitRefs": [
      "b718397",
      "ae123eb",
      "5a57a08",
      "77e281f",
      "d9ff7d7",
      "b1aab09"
    ],
    "originalSlide": 43
  },
  {
    "cards": [
      [
        "Stage 1 · 단위세대",
        "7개 커밋 · 테스트 35→49 → package/planby-unit-planner.html"
      ],
      [
        "Stage 2 · 동평면",
        "9개 커밋 · 테스트 35→63 → dist/planby-building-plan.html"
      ],
      [
        "Stage 3 · 단지배치",
        "10개 커밋 · 테스트 35→70 → package/planby-site-planner.html"
      ],
      [
        "남은 일",
        "세 브랜치 병합 → 공통 모듈 계약(shape, outline, selectedUnitId) 맞추기"
      ]
    ],
    "prompt": null,
    "checks": [],
    "repair": null,
    "note": "병합 때 확인할 지점: Stage 1의 도면 id 선택(selectedUnitId)·빈 도면(custom), 59형 깊이 8.3→9.2m 변경이 Stage 2 후보 크기에 주는 영향, Stage 3의 engine/state 선택 필드(height, profile, shape, layouts). 각 세션이 남긴 계약 메모를 먼저 읽힌다.",
    "image": null,
    "visual": null,
    "links": [],
    "explain": [],
    "kind": "table",
    "part": "11 · 패키징 · 배포와 정리",
    "time": "232–236분",
    "title": "세 단계 결과 요약",
    "lead": "단계별 기능과 최종 파일을 정리합니다. 관련 커밋의 기준 소스는 실습 요청문 안에서 바로 찾습니다.",
    "gitRefs": [],
    "originalSlide": 44
  },
  {
    "cards": [],
    "prompt": null,
    "checks": [
      "세 단계가 각자 다른 브랜치·폴더·세션에서 열렸다.",
      "Stage 1 도면을 요청문 → patch JSON → 적용으로 한 번 고쳤다.",
      "Stage 1 평면 JSON으로 Stage 2 후보가 생성됐다.",
      "Stage 2 후보 JSON을 Stage 3 대지에 불러왔다.",
      "거리선에서 “실제 / 요구”와 근거 프리셋·확인일을 읽었다.",
      "단일 HTML 하나를 브라우저에서 서버 없이 열었다."
    ],
    "repair": null,
    "note": "수강생 한 명의 결과를 같이 본다. 마지막으로 “법규 적합 판정이 아니라 입력 가정에 대한 기하 검토”라는 문장을 다시 읽는다.",
    "image": null,
    "visual": null,
    "links": [],
    "explain": [],
    "kind": "checklist",
    "part": "11 · 패키징 · 배포와 정리",
    "time": "236–240분",
    "title": "완주 확인 · 여섯 가지 증거",
    "lead": "화면이 그럴듯해 보이는 것과 실제로 확인한 것을 구분합니다.",
    "gitRefs": [],
    "originalSlide": 45
  },
  {
    "cards": [],
    "prompt": null,
    "checks": [],
    "repair": null,
    "note": "HTML 발표는 방향키, 전체보기 G, 강사노트 N, 자료실 R, 전체화면 F를 지원한다. 프롬프트는 슬라이드의 “요청 복사”로 복사한다. 이 덱은 share.planby.us/haud-cad-mcp-skill 강의의 구성과 화면 형식을 따랐고 내용·도식·프롬프트는 이번 작업 기록으로 새로 작성했다.",
    "image": null,
    "visual": null,
    "links": [],
    "explain": [],
    "kind": "resources",
    "part": "APPENDIX · 자료실",
    "time": "수업 후에도 사용",
    "title": "강의자료와 실습 파일",
    "lead": "수업 에셋 · 단계별 시작/완성 소스 · 실습 입력 JSON · 요청문 · 계산 엔진",
    "gitRefs": [],
    "originalSlide": 46
  },
  {
    "cards": [
      [
        "수업 자료",
        "자료실에서 에셋과 Stage별 시작 소스를 내려받아 준비합니다. Git 복원·인계서는 강의에서 설명하지 않습니다."
      ],
      [
        "CAD 실습",
        "코어 DWG 6개를 제공하며 AutoCAD MCP가 없으면 cores.json을 사용합니다."
      ],
      [
        "기준 결과",
        "각 실습 요청문의 공개 GitHub 커밋·소스 링크에서 단계별 결과를 확인합니다."
      ],
      [
        "법령 재확인",
        "프리셋 원문 확인일은 2026-10-15. 수업일 기준 개정 여부를 법제처 원문에서 다시 확인합니다."
      ]
    ],
    "prompt": null,
    "checks": [],
    "repair": null,
    "note": "실습 세션은 사용량 한도에 걸릴 수 있다(실제 기록에서도 두 번 중단 후 “다시 시도”로 재개). 긴 요청은 나눠 넣고, 각 단계 끝에 커밋하게 한다.",
    "image": null,
    "visual": null,
    "links": [],
    "explain": [],
    "kind": "cards",
    "part": "APPENDIX · 강사 운영",
    "time": "수업 전 점검",
    "title": "강사가 준비할 것",
    "lead": "수업 전날 한 번 처음부터 끝까지 따라가 봅니다.",
    "gitRefs": [],
    "originalSlide": 47
  }
];
