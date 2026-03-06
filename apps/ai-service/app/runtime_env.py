from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv


@lru_cache(maxsize=1)
def load_runtime_env() -> None:
    root = Path(__file__).resolve().parents[1]
    load_dotenv(root / '.env', override=False)
    load_dotenv(root / '.env.local', override=False)
