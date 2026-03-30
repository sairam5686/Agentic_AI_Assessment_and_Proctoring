import sys
import os
from datetime import datetime, timezone
import random

# Add project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from Backend.Connection.Assessment_Connection import Enrollment_DB, Results_DB, MCQ_DB, Coding_Questions_DB, SQL_Questions_DB, Gaming_DB

def seed_results():
    print("Starting seeding process...")
    
    # Clean old mock results
    Results_DB.delete_many({})
    print("Cleaned existing results.")
    
    # Get all enrollments
    enrollments = list(Enrollment_DB.find())
    
    if not enrollments:
        print("No enrollments found. Aborting.")
        return

    for enrollment in enrollments:
        assessment_id = enrollment.get("assessment_id")
        candidates = enrollment.get("candidates", [])
        
        # Fetch Assessment Configs
        mcq_config = MCQ_DB.find_one({"assessment_id": assessment_id})
        coding_config = Coding_Questions_DB.find_one({"assessment_id": assessment_id})
        sql_config = SQL_Questions_DB.find_one({"assessment_id": assessment_id})
        gaming_config = Gaming_DB.find_one({"assessment_id": assessment_id})
        
        if not mcq_config and not coding_config and not sql_config and not gaming_config:
            print(f"No test configurations found for {assessment_id}. Skipping.")
            continue

        for candidate in candidates:
            candidate_id = candidate.get("candidate_id")
            
            # Determine status: 20% chance of "Not Completed"
            is_completed = random.random() > 0.2
            status = "Completed" if is_completed else "Not Completed"
            
            sections = []
            total_attempted = 0
            
            # Process MCQ
            if mcq_config:
                mcq_score = 0
                mcq_total = mcq_config.get("total_questions", 0)
                for section in mcq_config.get("sections", []):
                    s_name = section.get("section_name")
                    s_q_count = len(section.get("questions", []))
                    if is_completed:
                        s_score = random.randint(int(s_q_count * 0.4), s_q_count)
                        mcq_score += s_score
                    else:
                        s_score = 0
                
                sections.append({
                    "name": "MCQ", 
                    "score": mcq_score, 
                    "total": mcq_total, 
                    "time": f"{random.randint(10, 20) if is_completed else 0}m"
                })
                if is_completed:
                    total_attempted += random.randint(int(mcq_total * 0.8), mcq_total)

            # Process Coding
            if coding_config:
                coding_score = 0
                coding_total = 0
                for q in coding_config.get("questions", []):
                    q_marks = q.get("marks", 0)
                    coding_total += q_marks
                    if is_completed:
                        # Simulate passing some test cases
                        q_score = random.choice([0, q_marks * 0.5, q_marks])
                        coding_score += q_score
                
                sections.append({
                    "name": "Coding", 
                    "score": int(coding_score), 
                    "total": int(coding_total), 
                    "time": f"{random.randint(20, 40) if is_completed else 0}m"
                })
                if is_completed:
                    total_attempted += len(coding_config.get("questions", []))

            # Process SQL
            if sql_config:
                sql_score = 0
                sql_total = sum(q.get("marks", 0) for q in sql_config.get("questions", []))
                for q in sql_config.get("questions", []):
                    q_marks = q.get("marks", 0)
                    if is_completed:
                        s_score = random.choice([0, q_marks * 0.5, q_marks])
                        sql_score += s_score
                
                sections.append({
                    "name": "SQL", 
                    "score": int(sql_score), 
                    "total": int(sql_total), 
                    "time": f"{random.randint(5, 15) if is_completed else 0}m"
                })
                if is_completed:
                    total_attempted += len(sql_config.get("questions", []))

            # Overall Score Calculation
            actual_total_marks = sum(s["total"] for s in sections)
            actual_secured_marks = sum(s["score"] for s in sections)
            
            # Process Gaming
            if gaming_config and gaming_config.get("games"):
                for game in gaming_config.get("games", []):
                    if game.get("enabled"):
                        rounds = game.get("rounds_count", 0)
                        gaming_total = rounds * 10
                        if is_completed:
                            gaming_score = random.randint(int(gaming_total * 0.5), gaming_total)
                        else:
                            gaming_score = 0
                        
                        sections.append({
                            "name": "Games",
                            "score": gaming_score,
                            "total": gaming_total,
                            "time": f"{game.get('total_duration', 12) if is_completed else 0}m"
                        })
                        
                        actual_total_marks += gaming_total
                        actual_secured_marks += gaming_score

            time_taken_mins = sum(int(s["time"].replace('m', '')) for s in sections)
            
            result = {
                "assessment_id": assessment_id,
                "candidate_id": candidate_id,
                "secured_marks": actual_secured_marks,
                "total_marks": actual_total_marks,
                "status": status,
                "time_taken": f"{time_taken_mins}m {random.randint(0, 59) if is_completed else 0}s",
                "questions_attempted": total_attempted,
                "questions_not_attempted": random.randint(0, 3) if is_completed else actual_total_marks,
                "sections": sections,
                "proctoring_score": random.randint(92, 99) if is_completed else 0,
                "violations": [],
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            Results_DB.insert_one(result)
            print(f"Seeded status '{status}' result for candidate {candidate_id} in assessment {assessment_id}")

if __name__ == "__main__":
    seed_results()
    print("Seeding complete.")
