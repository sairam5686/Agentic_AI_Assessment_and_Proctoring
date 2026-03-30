import cv2
import numpy as np
import time
from Connectivity import ProctoringSession, analyze_frame

def test_single_frame():
    print("--- Initializing Proctoring Session ---")
    try:
        # Create a session (This will load YOLO and MediaPipe)
        session = ProctoringSession()
        print("Session initialized successfully.\n")

        # Create a blank "test" frame (640x480)
        # We'll make it green to represent a "clean" environment
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        frame[:] = (0, 255, 0) 

        print("--- Analyzing Blank Frame ---")
        start_time = time.time()
        result = analyze_frame(
            frame=frame,
            assessment_id="test_assessment",
            email_id="test@example.com",
            session=session
        )
        end_time = time.time()

        print(f"Analysis complete in {end_time - start_time:.4f}s")
        print("Result Summary:")
        print(f"  Suspicion Score: {result['suspicion_score']}")
        print(f"  Risk Level:      {result['risk_level']}")
        print(f"  People Count:    {result['vision']['people_count']}")
        print(f"  Face Visible:    {result['vision']['face_visible']}")
        print(f"  Violations:      {result['violations_this_frame']}")
        print(f"  Total Violations:{result['total_violation_count']}")

        # Test behavior with a simulated violation
        print("\n--- Testing Violation Tracking ---")
        # We manually trigger a violation in the agent to see if it's tracked
        session.violation_agent.log_violation("test_violation", frame)
        print(f"  Count after 1 manual log: {len(session.violation_agent.violations)}")
        # Note: We can't easily simulate YOLO detections without a real image,
        # but we can check if the code runs.

        session.close()
        print("\nTest finished successfully!")

    except Exception as e:
        import traceback
        print(f"\n[CRITICAL ERROR] Test failed: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    test_single_frame()
