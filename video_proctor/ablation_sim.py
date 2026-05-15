"""
ablation_sim.py
───────────────────────────────────────────────────────────────────────────────
Standalone ablation-study simulator.

Runs a synthetic proctoring session through the REAL agent stack
(RiskAgent → SupervisorAgent → ReportAgent) so that ablation_report.json
and analytics.json are produced without a live webcam or FastAPI server.

Usage:
    cd video_proctor
    python ablation_sim.py
"""

import os
import sys
import time
import json
import numpy as np

# Force UTF-8 output so Unicode chars work on Windows cp1252 terminals
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# ── Make sure imports resolve from video_proctor/ ─────────────────────────────
sys.path.insert(0, os.path.dirname(__file__))

# ── Minimal stub for the `state` module (no FastAPI / server needed) ──────────
import types
state_mod = types.ModuleType("state")
state_mod.risk_agent       = None
state_mod.violation_agent  = None
state_mod.risk_score       = 0
state_mod.trust_score      = 50
state_mod.violation_score  = 0
state_mod.Assessment_id    = "SIM-2026-001"
state_mod.Email_id         = "candidate@simulation.test"
state_mod.proctoring_active = False
state_mod.save_state       = lambda: None
sys.modules["state"] = state_mod

# ── Stub out MongoDB / Cloudinary so we don't need live services ─────────────
import types, unittest.mock

# Build a fake cloudinary object that silently swallows uploads
fake_cloudinary = types.SimpleNamespace(
    uploader=types.SimpleNamespace(
        upload=lambda *a, **kw: {"secure_url": "http://sim/evidence.jpg"}
    )
)

# Connections package
connections_pkg = types.ModuleType("Connections")
connections_pkg.__path__ = []
sys.modules["Connections"] = connections_pkg

# Connections.EvidanceImage
ev_mod = types.ModuleType("Connections.EvidanceImage")
ev_mod.cloudinary = fake_cloudinary
sys.modules["Connections.EvidanceImage"] = ev_mod
connections_pkg.EvidanceImage = ev_mod

# Connections.ViolationLogsDB
vl_mod = types.ModuleType("Connections.ViolationLogsDB")
vl_mod.violation_logs_collection = unittest.mock.MagicMock()
vl_mod.Risk_Score_DB             = unittest.mock.MagicMock()
vl_mod.CodeEvaluation_collection = unittest.mock.MagicMock()
sys.modules["Connections.ViolationLogsDB"] = vl_mod
connections_pkg.ViolationLogsDB = vl_mod

# Now safe to import the real agents
from agents.risk_agent       import RiskAgent
from agents.violation_agent  import ViolationAgent
from agents.supervisor_agent import SupervisorAgent
from agents.report_agent     import ReportAgent

# ── Black 480×640 frame (no camera needed) ────────────────────────────────────
BLANK_FRAME = np.zeros((480, 640, 3), dtype=np.uint8)

# ─────────────────────────────────────────────────────────────────────────────
# Boot agents
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("  ABLATION STUDY SIMULATION")
print("="*60)
print(f"  Assessment : SIM-2026-001")
print(f"  Candidate  : candidate@simulation.test")
print(f"  Started    : {time.strftime('%Y-%m-%d %H:%M:%S')}")
print("="*60 + "\n")

risk_agent       = RiskAgent()
violation_agent  = ViolationAgent()
supervisor_agent = SupervisorAgent(risk_agent, violation_agent)
report_agent     = ReportAgent(risk_agent, violation_agent, supervisor_agent)

# Wire into state stub so update_risk() can write to it
state_mod.risk_agent      = risk_agent
state_mod.violation_agent = violation_agent


# ─────────────────────────────────────────────────────────────────────────────
# Helper: push N consecutive identical detections so _should_fire() passes
# ─────────────────────────────────────────────────────────────────────────────
def fire_vision(face_visible=True, multiple_people=False, illegal_objects=None, reps=6):
    """Simulate N consecutive frames with the given vision detection."""
    vd = {
        "face_visible":    face_visible,
        "multiple_people": multiple_people,
        "illegal_objects": illegal_objects or [],
    }
    for _ in range(reps):
        supervisor_agent.supervise_vision(vd, BLANK_FRAME)
        time.sleep(0.05)


def fire_attention(attention=100, drowsy=False, head_turn=False, mouth_open=False, reps=11):
    """Simulate N consecutive frames with the given attention detection."""
    ad = {
        "attention":  attention,
        "drowsy":     drowsy,
        "head_turn":  head_turn,
        "mouth_open": mouth_open,
    }
    for _ in range(reps):
        supervisor_agent.supervise_attention(ad, BLANK_FRAME)
        time.sleep(0.05)


def fire_audio(talking=False, loud_noise=False, reps=6):
    """Simulate N consecutive audio frames."""
    aud = {"talking": talking, "loud_noise": loud_noise}
    for _ in range(reps):
        supervisor_agent.supervise_audio(aud, BLANK_FRAME)
        time.sleep(0.05)


def fire_spoofing(is_spoof=False, reps=3):
    """Simulate N consecutive spoofing detection frames."""
    sd = {"is_spoof": is_spoof}
    for _ in range(reps):
        supervisor_agent.supervise_spoofing(sd, BLANK_FRAME)
        time.sleep(0.05)


# ─────────────────────────────────────────────────────────────────────────────
# SCENARIO 1 — Vision: face disappears (e.g. candidate looks down)
# ─────────────────────────────────────────────────────────────────────────────
print("[SIM] Scenario 1 · VISION  → face_not_visible  (6 consecutive frames)")
fire_vision(face_visible=False, reps=6)
time.sleep(1.5)   # exceed cooldown (5 s would be too long; we set 1.5s for demo)

# ─────────────────────────────────────────────────────────────────────────────
# SCENARIO 2 — Vision: second person walks in
# ─────────────────────────────────────────────────────────────────────────────
print("[SIM] Scenario 2 · VISION  → multiple_people    (4 consecutive frames)")
fire_vision(face_visible=True, multiple_people=True, reps=4)
time.sleep(1.5)

# ─────────────────────────────────────────────────────────────────────────────
# SCENARIO 3 — Vision: phone on desk (illegal object)
# ─────────────────────────────────────────────────────────────────────────────
print("[SIM] Scenario 3 · VISION  → illegal_object:phone (4 frames)")
fire_vision(face_visible=True, illegal_objects=["phone"], reps=4)
time.sleep(1.5)

# ─────────────────────────────────────────────────────────────────────────────
# SCENARIO 4 — Attention: head turn (looking sideways)
# ─────────────────────────────────────────────────────────────────────────────
print("[SIM] Scenario 4 · ATTENTION → head_turned       (6 consecutive frames)")
fire_attention(head_turn=True, reps=6)
time.sleep(1.5)

# ─────────────────────────────────────────────────────────────────────────────
# SCENARIO 5 — Attention: drowsy
# ─────────────────────────────────────────────────────────────────────────────
print("[SIM] Scenario 5 · ATTENTION → drowsy             (11 consecutive frames)")
fire_attention(attention=20, drowsy=True, reps=11)
time.sleep(1.5)

# ─────────────────────────────────────────────────────────────────────────────
# SCENARIO 6 — Attention: mouth open (whispering)
# ─────────────────────────────────────────────────────────────────────────────
print("[SIM] Scenario 6 · ATTENTION → mouth_open         (9 consecutive frames)")
fire_attention(mouth_open=True, reps=9)
time.sleep(1.5)

# ─────────────────────────────────────────────────────────────────────────────
# SCENARIO 7 — Audio: talking detected
# ─────────────────────────────────────────────────────────────────────────────
print("[SIM] Scenario 7 · AUDIO    → talking             (6 consecutive frames)")
fire_audio(talking=True, reps=6)
time.sleep(1.5)

# ─────────────────────────────────────────────────────────────────────────────
# SCENARIO 8 — Audio: loud background noise
# ─────────────────────────────────────────────────────────────────────────────
print("[SIM] Scenario 8 · AUDIO    → loud_noise          (4 consecutive frames)")
fire_audio(loud_noise=True, reps=4)
time.sleep(1.5)

# ─────────────────────────────────────────────────────────────────────────────
# SCENARIO 9 — Spoofing: photo attack detected
# ─────────────────────────────────────────────────────────────────────────────
print("[SIM] Scenario 9 · SPOOFING → spoofing_attempt    (3 consecutive frames)")
fire_spoofing(is_spoof=True, reps=3)
time.sleep(1.5)

# ─────────────────────────────────────────────────────────────────────────────
# Also inject some raw false-positive frames (detected=True but not consecutive
# enough to pass _should_fire) so the shadow counter is higher than real.
# ─────────────────────────────────────────────────────────────────────────────
print("[SIM] Injecting sporadic false-positive frames (single detections)...")
# Single-frame detections — these will shadow-fire but NOT pass _should_fire
for _ in range(15):
    supervisor_agent.supervise_vision(
        {"face_visible": True, "multiple_people": True, "illegal_objects": []},
        BLANK_FRAME
    )
    supervisor_agent.supervise_attention(
        {"attention": 10, "drowsy": True, "head_turn": True, "mouth_open": False},
        BLANK_FRAME
    )
    # Clean frames so _should_fire buffer resets
    supervisor_agent.supervise_vision(
        {"face_visible": True, "multiple_people": False, "illegal_objects": []},
        BLANK_FRAME
    )
    supervisor_agent.supervise_attention(
        {"attention": 90, "drowsy": False, "head_turn": False, "mouth_open": False},
        BLANK_FRAME
    )
    time.sleep(0.02)

print()

# ─────────────────────────────────────────────────────────────────────────────
# Generate all reports
# ─────────────────────────────────────────────────────────────────────────────
duration      = 45.0   # simulated 45-second exam
avg_attention = 62.0   # simulated average attention

os.makedirs("outputs", exist_ok=True)
report_agent.generate_reports(duration, avg_attention)

# ─────────────────────────────────────────────────────────────────────────────
# Pretty-print the ablation report
# ─────────────────────────────────────────────────────────────────────────────
ablation_path  = "outputs/ablation_report.json"
analytics_path = "outputs/analytics.json"

print("\n" + "="*60)
print("  ABLATION REPORT  →  outputs/ablation_report.json")
print("="*60)
with open(ablation_path) as f:
    print(json.dumps(json.load(f), indent=2))

print("\n" + "="*60)
print("  SESSION ANALYTICS  →  outputs/analytics.json")
print("="*60)
with open(analytics_path) as f:
    data = json.load(f)
    # Print only the non-verbose keys for readability
    summary = {k: v for k, v in data.items()
               if k not in ("violations", "timeline", "warning_history", "pattern_summary")}
    print(json.dumps(summary, indent=2))

print("\n" + "="*60)
print("  SIMULATION COMPLETE ✅")
print(f"  ablation_report.json → {os.path.abspath(ablation_path)}")
print(f"  analytics.json       → {os.path.abspath(analytics_path)}")
print("="*60 + "\n")
