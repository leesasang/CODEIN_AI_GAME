"""CODE-IN AI GAME Streamlit deployment entrypoint."""

from pathlib import Path
import re

import streamlit as st


ROOT = Path(__file__).resolve().parent
GAME_FILE = ROOT / "CODEIN_VS_AI.html"


def build_game_fragment(document: str) -> str:
    """Convert the trusted standalone document into an embeddable fragment."""
    style_blocks = re.findall(r"<style>(.*?)</style>", document, flags=re.DOTALL | re.IGNORECASE)
    body_match = re.search(r"<body[^>]*>(.*?)</body>", document, flags=re.DOTALL | re.IGNORECASE)
    if not style_blocks or not body_match:
        raise ValueError("CODEIN_VS_AI.html의 스타일 또는 본문을 찾을 수 없습니다.")

    streamlit_overrides = """
      header[data-testid="stHeader"],
      [data-testid="stToolbar"],
      [data-testid="stDecoration"],
      footer[data-testid="stFooter"],
      #MainMenu {
        display: none !important;
      }

      .stApp,
      [data-testid="stAppViewContainer"],
      [data-testid="stMain"] {
        background: #0b1220 !important;
      }

      .block-container,
      [data-testid="stMainBlockContainer"],
      [data-testid="stAppViewBlockContainer"] {
        width: 100% !important;
        max-width: none !important;
        padding: 0 !important;
      }

      [data-testid="stVerticalBlock"] {
        gap: 0 !important;
      }

      [data-testid="stHtml"] {
        width: 100% !important;
      }
    """
    styles = "\n".join(style_blocks)
    return f"<style>{styles}\n{streamlit_overrides}</style>\n{body_match.group(1)}"


st.set_page_config(
    page_title="CODE-IN vs AI",
    page_icon="♟",
    layout="wide",
    initial_sidebar_state="collapsed",
)

if not GAME_FILE.exists():
    st.error("CODEIN_VS_AI.html 파일을 찾을 수 없습니다.")
    st.stop()

try:
    game_fragment = build_game_fragment(GAME_FILE.read_text(encoding="utf-8"))
except (OSError, ValueError) as error:
    st.error(f"게임을 불러오지 못했습니다: {error}")
    st.stop()

# 저장소에 포함된 고정 HTML만 실행하며 사용자 입력 HTML은 받지 않는다.
st.html(game_fragment, width="stretch", unsafe_allow_javascript=True)
