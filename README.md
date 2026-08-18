# CODE-IN vs AI

Code-in 홍보부스에서 사용하는 오프라인 틱택토·오목·체스 AI 대결 게임입니다.

## 실행 방법

1. 압축을 푼 뒤 `START_GAME.bat`을 더블클릭합니다.
2. 화면 오른쪽 위의 전체화면 버튼 또는 키보드 `F`를 누릅니다.
3. 참가자가 틱택토, 오목, 체스 중 하나를 선택해 AI와 대결합니다.

별도의 설치, 로그인, 인터넷 연결이 필요하지 않습니다. Chrome 또는 Edge 브라우저 사용을 권장합니다.
`CODEIN_VS_AI.html` 파일을 직접 더블클릭해도 동일하게 실행됩니다.

## Streamlit 배포

이 폴더는 디자인과 게임 기능을 그대로 유지한 Streamlit 배포를 지원합니다.

```bash
python -m pip install -r requirements.txt
python -m streamlit run streamlit_app.py
```

Streamlit Community Cloud에서는 저장소의 Main file path를 `streamlit_app.py`로 지정합니다.
자세한 순서는 `DEPLOY_STREAMLIT.md`를 확인하세요.

## 축제 당일 운영

- 노트북 3대에 이 폴더를 각각 복사합니다.
- 각 노트북에서 `START_GAME.bat`을 실행합니다.
- 승리 화면이 나오면 운영진이 확인한 뒤 상품을 지급합니다.
- `다음 참가자`를 누르면 같은 게임이 즉시 초기화됩니다.
- `다른 게임 선택`을 누르면 첫 화면으로 돌아갑니다.
- 첫 화면의 `오늘의 대결 기록`은 노트북별로 자동 저장됩니다.

## 단축키

| 키 | 기능 |
|---|---|
| `T` | 틱택토 시작 |
| `O` | 오목 시작 |
| `C` | 체스 시작 |
| `F` | 전체화면 |
| `R` | 현재 게임 재시작 |
| `Esc` | 게임 선택 화면 |
| `Enter` | 결과 화면에서 다음 참가자 시작 |

## 게임 규칙

- 틱택토: 참가자가 X로 선공하며, 45초 안에 3칸을 연결하면 승리합니다.
- 오목: 참가자가 흑돌로 선공하며, 90초 안에 5개의 돌을 연결하면 승리합니다.
- 체스: 참가자가 백으로 선공하며, 3분 안에 AI를 체크메이트하면 승리합니다. 캐슬링·앙파상·자동 퀸 승격을 지원합니다.
- 모든 AI는 무작위 실수 없이 항상 계산 결과가 가장 좋은 수를 선택합니다.

## 파일 구성

- `index.html`: 게임 화면
- `styles.css`: Code-in 색상과 화면 디자인
- `ai.js`: 틱택토·오목 AI 판단 로직
- `chess.js`: 체스 규칙과 알파–베타 탐색 AI
- `game.js`: 게임 진행, 타이머, 점수판, 결과 처리
- `CODEIN_VS_AI.html`: 위 파일을 하나로 합친 실제 배포용 게임
- `START_GAME.bat`: Windows용 실행 파일
- `streamlit_app.py`: Streamlit 배포 시작 파일
- `requirements.txt`: Streamlit 실행 의존성
- `.streamlit/config.toml`: Streamlit 다크 테마와 서버 설정
- `DEPLOY_STREAMLIT.md`: GitHub·Streamlit Community Cloud 배포 안내

모든 기능은 브라우저 안에서 실행되므로 서버나 백엔드가 필요하지 않습니다.
