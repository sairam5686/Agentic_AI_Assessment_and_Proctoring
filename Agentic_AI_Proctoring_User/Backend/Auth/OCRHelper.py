import re
import cv2
import numpy as np
import easyocr
import base64
import difflib
from typing import Optional, List

# Initialize EasyOCR reader (loads model once, reused for all requests)
_reader = None

def get_reader():
    global _reader
    if _reader is None:
        import sys
        import os
        print("[OCR] Loading EasyOCR model (first time only)...")
        # Silence stdout and stderr to prevent download progress bar from spamming Railway logs
        devnull = open(os.devnull, 'w')
        old_stdout = sys.stdout
        old_stderr = sys.stderr
        try:
            sys.stdout = devnull
            sys.stderr = devnull
            # Initialize for English
            _reader = easyocr.Reader(['en'], gpu=False, verbose=False)
        finally:
            sys.stdout = old_stdout
            sys.stderr = old_stderr
            devnull.close()
        print("[OCR] EasyOCR model loaded.")
    return _reader

def preprocess_for_ocr(image: np.ndarray, attempt: int = 0) -> np.ndarray:
    """Preprocess image for optimal OCR extraction with multiple strategies."""
    h, w = image.shape[:2]
    
    # Standardize size
    target_width = 1200
    if w != target_width:
        scale = target_width / w
        image = cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_LANCZOS4)

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    if attempt == 0:
        # Strategy 0: Denoised grayscale (good for clean lighting)
        return cv2.bilateralFilter(gray, 9, 75, 75)
    
    elif attempt == 1:
        # Strategy 1: Adaptive Threshold (good for uneven lighting/glare)
        return cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 21, 5)
    
    elif attempt == 2:
        # Strategy 2: High Contrast / Sharpened
        kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
        sharpened = cv2.filter2D(gray, -1, kernel)
        return sharpened
        
    return gray

def decode_base64_image(base64_string: str) -> np.ndarray:
    """Decode base64 string to OpenCV image."""
    if ',' in base64_string:
        base64_string = base64_string.split(',')[1]
    
    img_data = base64.b64decode(base64_string)
    nparr = np.frombuffer(img_data, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

def extract_id_info(image: np.ndarray, enrolled_name: str = "") -> dict:
    """Extract name and other info from ID card image using multi-pass EasyOCR."""
    reader = get_reader()
    all_extracted_text = []
    
    # Try multiple preprocessing strategies to find the best text
    for attempt in range(3):
        try:
            processed = preprocess_for_ocr(image, attempt=attempt)
            results = reader.readtext(processed, detail=1, paragraph=False, text_threshold=0.3)
            
            blocks = [text.strip() for (bbox, text, conf) in results if text.strip() and conf > 0.1]
            if blocks:
                all_extracted_text.extend(blocks)
                print(f"[OCR] Attempt {attempt} extracted {len(blocks)} blocks.")
                
                # SHORT-CIRCUIT: If we have enough blocks and we have an enrolled_name, 
                # check if we can already verify to save time
                if enrolled_name:
                    current_raw = "\n".join(all_extracted_text)
                    if verify_candidate_name(None, enrolled_name, current_raw):
                        print(f"[OCR] Short-circuiting: Name found in attempt {attempt}")
                        break
        except Exception as e:
            print(f"[OCR] Attempt {attempt} failed: {e}")

    # Deduplicate and combine
    unique_lines = list(dict.fromkeys(all_extracted_text))
    raw_text = "\n".join(unique_lines)
    
    print(f"[OCR] Total Raw Text Extracted:\n{raw_text}")

    # STRICT REJECTION: If this is a PAN card, reject it immediately
    pan_keywords = ["income tax department", "permanent account number", "govt. of india"]
    raw_lower = raw_text.lower()
    if any(k in raw_lower for k in pan_keywords) and "college" not in raw_lower:
        print("[OCR] REJECTED: PAN Card detected.")
        raise Exception("PAN cards are not accepted. Please use your College ID Card.")

    # Attempt to find "Name" specifically
    name = None
    for i, text in enumerate(unique_lines):
        clean_line = text.lower()
        if "name" in clean_line:
            # Look for colon or just use the next part of the string
            match = re.search(r"name\s*[:\-]\s*(.*)", clean_line)
            if match:
                name = match.group(1).strip()
                break
            # Or if it's just "NAME" on one line, take the next line
            if len(clean_line.replace("name", "").strip()) < 3 and i + 1 < len(unique_lines):
                name = unique_lines[i+1].strip()
                break

    return {
        "name": name,
        "raw_text": raw_text,
        "lines": unique_lines
    }

def verify_candidate_name(extracted_name: Optional[str], enrolled_name: str, raw_text: str) -> bool:
    """Robust fuzzy name verification."""
    if not enrolled_name:
        return False
    
    enrolled_name = enrolled_name.lower().strip()
    enrolled_clean = re.sub(r"[^a-z0-9\s]", " ", enrolled_name).strip()
    name_parts = enrolled_clean.split()
    
    raw_lower = raw_text.lower()
    clean_raw = re.sub(r"[^a-z0-9\s]", " ", raw_lower)
    raw_words = clean_raw.split()
    
    print(f"[OCR] Verifying: '{enrolled_name}'")
    
    # 1. Check for exact or sub-word matches for each significant part
    significant_parts = [p for p in name_parts if len(p) >= 3]
    if not significant_parts:
        significant_parts = name_parts
        
    parts_matched = 0
    for part in significant_parts:
        # Exact match in raw words
        if part in raw_words:
            parts_matched += 1
            print(f"[OCR] Part '{part}' matched exactly.")
            continue
            
        # Fuzzy match in raw words (handles typos like SR1DHARAN)
        # We look for a word in raw_words that is very similar to our part
        closest_matches = difflib.get_close_matches(part, raw_words, n=1, cutoff=0.7)
        if closest_matches:
            parts_matched += 1
            print(f"[OCR] Part '{part}' matched fuzzy to '{closest_matches[0]}'.")
            continue
            
        # Try finding the part within long strings (no spaces case)
        if part in clean_raw:
            parts_matched += 1
            print(f"[OCR] Part '{part}' found in substring.")
            continue

    # Require all significant parts to match (fuzzy or exact)
    if parts_matched >= len(significant_parts):
        return True
        
    # 2. Fallback: Entire name fuzzy match
    # Join raw words back and check for the whole name sequence
    closest_full = difflib.get_close_matches(enrolled_clean, [clean_raw], n=1, cutoff=0.6)
    if closest_full:
        print(f"[OCR] Full name matched fuzzy.")
        return True
            
    return False
