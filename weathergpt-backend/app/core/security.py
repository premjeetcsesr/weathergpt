import re
import html


def sanitize_input_text(text: str, max_length: int = 500) -> str:
    """Sanitize and trim input text to prevent injection or malicious inputs."""
    if not text:
        return ""
    # Strip whitespace and truncate length
    cleaned = text.strip()[:max_length]
    # Escape HTML special characters
    cleaned = html.escape(cleaned)
    # Remove control characters
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", cleaned)
    return cleaned
