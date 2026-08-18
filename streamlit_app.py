"""CODE-IN AI GAME Streamlit deployment entrypoint."""

from pathlib import Path

import streamlit as st
from streamlit.components.v1 import html as component_html


ROOT = Path(__file__).resolve().parent
GAME_FILE = ROOT / "CODEIN_VS_AI.html"

STREAMLIT_OVERRIDES = """
<style>
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

  iframe[title="streamlit.components.v1.html"] {
    display: block !important;
    width: 100% !important;
    border: 0 !important;
  }
</style>
"""

FRAME_RESIZER = """
<script>
  (() => {
    try {
      const frame = window.frameElement;
      if (!frame) return;
      const resizeFrame = () => {
        const viewportHeight = window.parent.innerHeight || 900;
        frame.style.height = `${Math.max(760, viewportHeight)}px`;
        frame.style.width = "100%";
        frame.style.border = "0";
      };
      resizeFrame();
      window.parent.addEventListener("resize", resizeFrame);
    } catch (_error) {
      // 고정 높이에서도 게임은 정상적으로 실행된다.
    }
  })();
</script>
"""


def prepare_game_document(document: str) -> str:
    """Append iframe sizing code without changing the standalone game."""
    if "</body>" not in document.lower():
        raise ValueError("CODEIN_VS_AI.html의 body 태그를 찾을 수 없습니다.")
    closing_index = document.lower().rfind("</body>")
    return f"{document[:closing_index]}{FRAME_RESIZER}{document[closing_index:]}"


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
    game_document = prepare_game_document(GAME_FILE.read_text(encoding="utf-8"))
except (OSError, ValueError) as error:
    st.error(f"게임을 불러오지 못했습니다: {error}")
    st.stop()

# Streamlit 외부 UI만 정리하고, 검증된 단일 HTML은 독립 문서로 실행한다.
st.html(STREAMLIT_OVERRIDES)
component_html(game_document, height=960, scrolling=True, tab_index=0)
