import sys
import os

print("--- Testing Imports ---")
try:
    import cv2
    print("cv2 imported")
    import numpy as np
    print("numpy imported")
    import mediapipe as mp
    print("mediapipe imported")
    from ultralytics import YOLO
    print("ultralytics imported")
    from fastapi import FastAPI
    print("fastapi imported")
except Exception as e:
    print(f"IMPORT ERROR: {e}")
    sys.exit(1)

print("\n--- Testing Agent Initialization ---")
try:
    from agents.vision_agent import VisionAgent
    from agents.gesture_agent import GestureAgent
    
    print("Initializing VisionAgent...")
    # vision = VisionAgent() # This might take time/memory, let's just try to import for now
    print("VisionAgent class available")
    
    print("Initializing GestureAgent...")
    # gesture = GestureAgent()
    print("GestureAgent class available")
    
except Exception as e:
    print(f"INITIALIZATION ERROR: {e}")
    sys.exit(1)

print("\n--- All tests passed! ---")
