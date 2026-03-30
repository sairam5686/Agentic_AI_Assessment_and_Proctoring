# state.py — retained as a minimal compatibility shim.
# The new function-call architecture no longer uses global shared state.
# All session data flows through ProctoringSession in main.py.
#
# This file is kept so any external scripts that import state don't break.

# Deprecated — kept for backward compat only
latest_frame      = None
latest_frame_time = 0.0
Assessment_id     = ""
Email_id          = ""
proctoring_active = False

risk_agent        = None
violation_agent   = None