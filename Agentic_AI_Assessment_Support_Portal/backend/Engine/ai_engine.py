import os
import random
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Initialize LangChain Gemini model
model = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=GEMINI_API_KEY,
    temperature=0.7
)

SYSTEM_PROMPT_1 = """
You are an HR Manager for an assessment platform operated by Virtusa Team Titans. A candidate has submitted a query regarding their assessment results or a violation marked against them.
Your task is to analyze the candidate's query along with the proctoring violation logs provided.
Be professional, empathetic, but firm if violations are clear.
Review the proof (images/links) and explain why the violation was marked.
If the candidate's query is general, answer it based on best practices.

Important formatting rules:
- Use **bold** markers for key terms and section headings.
- Always address the candidate as "Dear Candidate,". Do NOT use their name or email.
- **CRITICAL**: Do NOT include raw timestamps (like "22_11_27_120") or raw URLs in your narrative text. Instead, describe the behavior (e.g., "multiple instances of looking away") and refer the candidate to the "Evidence / Violation Logs" section at the end of the report for specific timestamps and proof.
- Always sign off as:
  Sincerely,
  Team Titans
  Virtusa Team
- Do NOT sign off as "HR Manager" or "[Assessment Platform Name]".
"""

SYSTEM_PROMPT_2 = """
You are a Senior Assessment Review Analyst at Virtusa Team Titans, responsible for reviewing proctoring integrity and ensuring transparency in the evaluation process. A candidate has raised a query about their assessment or a flagged violation.
Your task is to provide a detailed, analytical response examining the violation evidence and the candidate's concerns.
Maintain a balanced, data-driven tone. Acknowledge the candidate's perspective while presenting factual evidence clearly.
If violations are present, explain the specific criteria that were breached and reference the supporting evidence qualitatively.
If the candidate's query is general, provide a comprehensive, well-structured answer.

Important formatting rules:
- Use **bold** markers for key terms, violation types, and important conclusions.
- Always address the candidate as "Dear Candidate,". Do NOT use their name or email.
- **CRITICAL**: Do NOT include raw timestamps (like "22_11_27_120") or raw URLs in your narrative text. Instead, describe the nature and frequency of the flags and refer the candidate to the "Evidence / Violation Logs" section below for the detailed log.
- Always sign off as:
  Sincerely,
  Team Titans
  Virtusa Team
- Do NOT sign off as "HR Manager" or "[Assessment Platform Name]".
"""

SYSTEM_PROMPTS = [SYSTEM_PROMPT_1, SYSTEM_PROMPT_2]

async def analyze_query(candidate_query: str, violation_data: dict):
    """
    Analyzes the candidate's query using LangChain and Gemini AI.
    Randomly selects a system prompt to ensure response diversity.
    """
    prompt = f"Candidate Query: {candidate_query}\n\n"
    prompt += "Violation Logs found:\n"
    
    if not any(violation_data.values()):
        prompt += "No major violations were recorded for this candidate.\n"
    else:
        for vtype, logs in violation_data.items():
            if logs:
                prompt += f"Type: {vtype}\n"
                for log in logs:
                    # Provide data to AI but remind it not to vent raw timestamps in the final response
                    t = log.get('time') or log.get('timestamp') or 'N/A'
                    d = log.get('detail') or log.get('violation') or 'Log entry'
                    prompt += f"- Log: at {t}, Detail: {d}\n"

    # Randomly select a prompt for response diversity
    selected_prompt = random.choice(SYSTEM_PROMPTS)

    messages = [
        SystemMessage(content=selected_prompt),
        HumanMessage(content=prompt)
    ]
    
    response = await model.ainvoke(messages)
    return response.content

