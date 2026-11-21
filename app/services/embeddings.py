from functools import lru_cache
import hashlib

from app.config import settings


@lru_cache(maxsize=1)
def _model():
    try:
        from sentence_transformers import SentenceTransformer
        return SentenceTransformer(settings.embedding_model)
    except Exception:
        return None


def embed_text(text: str) -> list[float]:
    model = _model()
    if model is not None:
        return model.encode(text, normalize_embeddings=True).tolist()

    digest = hashlib.sha256(text.lower().encode("utf-8")).digest()
    return [(byte - 128) / 128.0 for byte in digest] * 12
