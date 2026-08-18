# Streamlit Community Cloud 배포 방법

## 1. GitHub 저장소 만들기

1. GitHub에서 새 저장소를 만듭니다.
2. 이 폴더 안의 파일을 모두 저장소 최상위에 업로드합니다.
3. 특히 아래 파일이 같은 위치에 있어야 합니다.
   - `streamlit_app.py`
   - `CODEIN_VS_AI.html`
   - `requirements.txt`
   - `.streamlit/config.toml`

## 2. Streamlit에 배포하기

1. `https://share.streamlit.io`에 GitHub 계정으로 로그인합니다.
2. **Create app** 또는 **Deploy an app**을 선택합니다.
3. 방금 만든 GitHub 저장소와 브랜치를 선택합니다.
4. **Main file path**에 `streamlit_app.py`를 입력합니다.
5. **Deploy**를 누릅니다.

별도의 API 키, 데이터베이스, 외부 서버는 필요하지 않습니다. 게임 AI와 점수 기록은 참가자의 브라우저에서 실행됩니다.

## 3. 내 컴퓨터에서 먼저 실행하기

Python 3.11 이상이 설치된 상태에서 이 폴더의 터미널을 열고 아래 명령을 실행합니다.

```bash
python -m pip install -r requirements.txt
python -m streamlit run streamlit_app.py
```

실행 후 브라우저에서 `http://localhost:8501`을 열면 됩니다.

## 수정 후 반영

게임 코드를 수정했다면 먼저 아래 명령으로 단일 HTML을 다시 생성한 다음 GitHub에 올립니다.

```bash
node scripts/build-standalone.js
```

GitHub의 기본 브랜치에 변경 사항을 올리면 Streamlit Community Cloud가 앱을 다시 배포합니다.
