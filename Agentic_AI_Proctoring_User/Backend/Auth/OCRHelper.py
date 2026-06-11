import re
import cv2
import numpy as np
import base64
import difflib
from typing import Optional, List

# Bypassed EasyOCR implementation to speed up startup and avoid huge dependencies.
def get_reader():
    return None

def preprocess_for_ocr(image: np.ndarray, attempt: int = 0) -> np.ndarray:
    """Preprocess image (Bypassed)."""
    return image

def decode_base64_image(base64_string: str) -> np.ndarray:
    """Decode base64 string to OpenCV image."""
    if ',' in base64_string:
        base64_string = base64_string.split(',')[1]
    
    img_data = base64.b64decode(base64_string)
    nparr = np.frombuffer(img_data, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

def extract_id_info(image: np.ndarray, enrolled_name: str = "") -> dict:
    """Bypassed OCR info extraction. Instantly returns candidate name."""
    print("[OCR Helper] OCR extraction is bypassed.")
    return {
        "name": enrolled_name,
        "raw_text": enrolled_name,
        "lines": [enrolled_name]
    }

def verify_candidate_name(extracted_name: Optional[str], enrolled_name: str, raw_text: str) -> bool:
    """Fuzzy name verification bypassed. Always returns True."""
    print(f"[OCR Helper] Bypassed verification for: '{enrolled_name}'")
    return True
