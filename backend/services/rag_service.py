import re
import os
import pypdf
import requests
import json
from pathlib import Path
from dotenv import load_dotenv
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from . import gemini_client

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

class RAGService:

    @staticmethod
    def extract_text_from_pdf(file_path):
        text = ""
        with open(file_path, 'rb') as f:
            reader = pypdf.PdfReader(f)
            for page in reader.pages:
                text += page.extract_text() + "\n"
        return text

    @staticmethod
    def extract_text_from_docx(file_path):
        import zipfile
        import xml.etree.ElementTree as ET
        try:
            with zipfile.ZipFile(file_path) as z:
                xml_content = z.read('word/document.xml')
                root = ET.fromstring(xml_content)
                texts = []
                for paragraph in root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
                    p_text = []
                    for text in paragraph.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t'):
                        if text.text:
                            p_text.append(text.text)
                    if p_text:
                        texts.append("".join(p_text))
                return "\n".join(texts)
        except Exception as e:
            print(f"Error reading docx {file_path}: {e}")
            return ""

    @staticmethod
    def _clean_phone(raw_phone):
        """Clean and validate phone number to exactly 10 digits (Indian mobile)."""
        if not raw_phone:
            return None
        digits = re.sub(r'\D', '', raw_phone)
        # Remove common country codes: +91, 91, 0, 1
        if len(digits) == 12 and digits.startswith('91'):
            digits = digits[2:]
        elif len(digits) == 11 and digits.startswith('0'):
            digits = digits[1:]
        elif len(digits) == 11 and digits.startswith('1'):
            digits = digits[1:]
        elif len(digits) > 10:
            digits = digits[-10:]  # Take last 10 digits
        # Validate: must be exactly 10 digits and start with 6-9 (Indian mobile)
        if len(digits) == 10 and digits[0] in '6789':
            return digits
        # Fallback: if 10 digits but doesn't start with 6-9, still return
        if len(digits) == 10:
            return digits
        return None

    @staticmethod
    def extract_candidate_info(text, filename=""):
        info = {
            "name": "Unknown Candidate",
            "email": None,
            "phone": None
        }

        # 1. Regex Email
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        email_match = re.search(email_pattern, text)
        if email_match:
            info["email"] = email_match.group(0)

        # 1b. Regex Phone (Indian mobile + international formats)
        phone_patterns = [
            r'(?:\+91[\s.-]?)?[6-9]\d{4}[\s.-]?\d{5}',           # +91 9876543210
            r'(?:0|91)?[\s.-]?[6-9]\d{4}[\s.-]?\d{5}',           # 091 98765 43210
            r'(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}', # US format fallback
            r'(?:\+?\d[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4,7}',  # General
        ]
        for pattern in phone_patterns:
            phone_matches = re.findall(pattern, text[:3000])
            for pm in phone_matches:
                cleaned = RAGService._clean_phone(pm)
                if cleaned:
                    info["phone"] = cleaned
                    break
            if info["phone"]:
                break

        # 2. Heuristic Name
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        for i in range(min(5, len(lines))):
            potential_name = lines[i]
            if (1 <= len(potential_name.split()) <= 4 and
                    len(potential_name) < 50 and
                    "@" not in potential_name and
                    not any(char.isdigit() for char in potential_name)):
                info["name"] = potential_name.title()
                break

        # 3. AI Fallback
        if not info["email"] or info["name"] == "Unknown Candidate" or not info["phone"]:
            try:
                header_text = text[:3000]
                ai_extracted = RAGService.extract_with_llm(header_text)
                if ai_extracted.get("name") and ai_extracted["name"] not in ["Unknown", "Null", None]:
                    info["name"] = ai_extracted["name"]
                if ai_extracted.get("email") and not info["email"]:
                    info["email"] = ai_extracted["email"]
                if ai_extracted.get("phone") and not info["phone"]:
                    # Clean AI-extracted phone too
                    cleaned_ai_phone = RAGService._clean_phone(ai_extracted["phone"])
                    if cleaned_ai_phone:
                        info["phone"] = cleaned_ai_phone
            except Exception as e:
                print(f"Candidate info extraction failed: {e}")

        # 4. Filename Fallback
        if info["name"] in ["Unknown Candidate", "Resume", "Cv", "Curriculum Vitae"] and filename:
            base = os.path.splitext(filename)[0]
            clean_name = base.replace("_", " ").replace("-", " ").title()
            clean_name = re.sub(r'\bresume\b|\bcv\b|\bprofile\b', '', clean_name, flags=re.IGNORECASE).strip()
            if clean_name:
                info["name"] = clean_name

        return info

    @staticmethod
    def extract_with_llm(text_chunk):
        """
        Legacy shim — delegates to screen_and_extract using only the extraction fields.
        Only used when regex fails to find email/name/phone.
        """
        if not gemini_client.has_gemini_key():
            return {}
        try:
            # Call the merged function with no JD — only contact fields will be populated
            result = RAGService._inner_extract_with_llm(text_chunk)
            return {
                "name": result.get("name"),
                "email": result.get("email"),
                "phone": result.get("phone"),
            }
        except Exception as e:
            print(f"Gemini extraction failed after retries: {e}")
            return {}

    @staticmethod
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=2, min=2, max=10),
        retry=retry_if_exception_type(Exception)
    )
    def _inner_extract_with_llm(text_chunk):
        """Contact-only extraction (fallback when no JD available)."""
        prompt = f"""
Extract the candidate's name, email, and phone from the resume text below.
Return null for any field not found.

RESUME:
{text_chunk[:3000]}

OUTPUT JSON ONLY:
{{
    "name": "Full Name or null",
    "email": "email@example.com or null",
    "phone": "phone number or null"
}}
"""
        return gemini_client.call_gemini(
            prompt=prompt,
            system_prompt="You are a data extraction assistant. Output valid JSON only.",
            temperature=0.1,
            json_mode=True
        )

    # ── MERGED SINGLE-CALL: extract contact info + score resume in one prompt ─────

    @staticmethod
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=2, min=2, max=10),
        retry=retry_if_exception_type(Exception)
    )
    def screen_and_extract(jd_text: str, full_text: str, weights: dict) -> dict:
        """
        Single Gemini call that simultaneously:
          • Extracts candidate contact info (name, email, phone)
          • Scores the resume against the JD using the weighted rubric
          • Returns extracted_role, skills, reasoning
          • Evaluates [CUSTOM REQUIREMENTS] and returns keyword tags for matches
        """
        sw = weights
        prompt = f"""
### System Instructions:
You are an advanced Automated Applicant Tracking System (ATS) and Senior Technical Recruiter. Perform candidate evaluation and data extraction based on the JOB DESCRIPTION and the CANDIDATE RESUME text.

### Inputs:
#### Job Description:
{jd_text}

#### Candidate Resume:
{full_text}

### Tasks:
1. **Contact Information Extraction**: Extract the candidate's full name, email address, and phone number.
   *CRITICAL CONTACT VALIDATION*: Do NOT extract placeholder, dummy, or redacted contact details (e.g. 'xxx@gmail.com', 'XXX-XXX-XXX', '123-456-7890', 'yourname@example.com', etc.). If the resume lacks actual valid contact details, you MUST return null for that field. Do not hallucinate or assume values.
2. **Role Normalization**: Identify the candidate's primary job title or role from their recent experience.
3. **Scoring & Evaluation**: Score the candidate's resume strictly against the criteria in the job description using the following weight weights:
   - **Skills Matching** (Max: {sw.get('skills', 40)} pts): Evaluate core required technologies/methodologies. Match rate determines the score.
   - **Experience Relevance** (Max: {sw.get('experience', 25)} pts): Assess length of relevant experience, seniority, and matching duties.
   - **Project / Role Alignment** (Max: {sw.get('projects', 20)} pts): Evaluate technical complexity, achievements, scale, and impact in previous roles/projects.
   - **Education Match** (Max: {sw.get('education', 10)} pts): Grade degree levels, fields of study, or relevant industry certifications.
   - **Preferred / Bonus Skills** (Max: {sw.get('bonus', 5)} pts): Look for preferred qualifications or secondary requirements.
   
   *ETHICAL SCORING RULES & DEDUCTIONS*:
   - Critically check for the presence of actual contact details. If a contact detail (like a phone number or email) is completely missing or contains only dummy/placeholder values, apply an incompleteness deduction of **10%** from the overall score to penalize unprofessional resume readiness.
   - Base the component scores strictly and objectively on the candidate's skills relative to the Job Description and the required keywords (if specified in the JD under 'Required Keywords:'). If the candidate lacks essential required skills or experience, grade them rigorously and lower the scores accordingly.
   - *Total Score constraint: The sum of the component scores MUST exactly equal the overall score after any deductions (max 100).*
4. **Experience Extraction**: Extract the candidate's total years of experience as a short string (e.g. "2 Years", "5 Years", "8+ Years", "None").
5. **Certification Match**: If "Additional Requirements / Certifications" are specified in the Job Description, evaluate if the candidate has met these certifications/requirements. Extract a list of matched certifications/requirements. If none are matched or specified, return an empty list.
6. **Custom Requirements Match**: If "[CUSTOM REQUIREMENTS]:" is specified in the Job Description, carefully read each requirement listed there. For EACH requirement that the candidate DOES meet based on their resume, generate a SHORT descriptive keyword tag (2-5 words max, e.g. "AWS Certified", "Bilingual English/Spanish", "6+ Years Leadership"). Return these as a list of matched keyword strings. If none match or none are specified, return an empty list.
7. **Candidate Summary**: Generate a short, professional, and concise summary of the candidate's profile and matching status (2-3 lines maximum, suitable for reports).
8. **Location Extraction**: Extract candidate's location (city, state/country or null).
9. **Education Details Extraction**: Extract candidate's highest degree, major, university, and year of graduation as a formatted string (e.g. "B.Tech in CS, Stanford (2022)" or null).

### Output Format:
Return a valid JSON object matching this schema. Do not output any preamble, markdown code blocks, or postamble.
{{
    "name": "Full Name or null",
    "email": "email@example.com or null",
    "phone": "phone number or null",
    "score": <0-100 integer representing the sum of component_scores>,
    "component_scores": {{
        "skills": <0-{sw.get('skills', 40)} integer>,
        "experience": <0-{sw.get('experience', 25)} integer>,
        "projects": <0-{sw.get('projects', 20)} integer>,
        "education": <0-{sw.get('education', 10)} integer>,
        "bonus": <0-{sw.get('bonus', 5)} integer>
    }},
    "key_skills_match": ["Skill A", "Skill B"],
    "missing_skills": ["Skill X", "Skill Y"],
    "reasoning": "Professional explanation details: 1) why the candidate received the matching scores, 2) core strengths, 3) notable gaps relative to requirements, and 4) detail any deductions applied (e.g. for missing/placeholder contact details).",
    "experience": "Candidate's total experience, e.g. 5 Years or 8+ Years",
    "certification_match": ["AWS Certified", "PMP Certified"],
    "custom_prompt_matches": ["AWS Certified", "Bilingual English/Spanish"],
    "candidate_summary": "Short 2-3 line summary suitable for reports",
    "location": "City, State/Country or null",
    "education_details": "Degree, University (Year) or null"
}}
"""
        return gemini_client.call_gemini(
            prompt=prompt,
            system_prompt="You are a Senior Technical Recruiter and ATS parser. Output valid JSON only.",
            temperature=0.1,
            json_mode=True
        )

    @staticmethod
    def screen_resume(jd_text, resume_id, resume_context=""):
        """
        Legacy shim kept for compatibility.
        In the main worker path, screen_and_extract() is used instead.
        """
        clean_jd = jd_text.strip()
        if len(clean_jd) < 15 or len(clean_jd.split()) < 3:
            return {
                "score": 0,
                "reasoning": "Job Description is too vague or invalid. Please provide a detailed description.",
                "key_skills_match": [],
                "missing_skills": []
            }
        if not gemini_client.has_gemini_key():
            return {"score": 0, "reasoning": "Missing API Key", "key_skills_match": [], "missing_skills": []}
        weights = RAGService._get_scoring_weights()
        return RAGService.screen_and_extract(jd_text, resume_context, weights)

    @staticmethod
    def extract_images_from_pdf(file_path: str) -> list:
        """
        Extract images from PDF page by page.
        Returns a list of PIL Image objects.
        """
        import io
        from PIL import Image
        import pypdf
        
        images = []
        with open(file_path, 'rb') as f:
            reader = pypdf.PdfReader(f)
            for page_num, page in enumerate(reader.pages):
                if len(images) >= 5:
                    break
                for image_file_object in page.images:
                    if len(images) >= 5:
                        break
                    try:
                        image_data = image_file_object.data
                        img = Image.open(io.BytesIO(image_data))
                        img.verify()
                        img = Image.open(io.BytesIO(image_data))
                        images.append(img)
                    except Exception as e:
                        print(f"Error extracting image on page {page_num}: {e}")
        return images

    @staticmethod
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=2, min=2, max=10),
        retry=retry_if_exception_type(Exception)
    )
    def screen_and_extract_from_images(jd_text: str, images: list, weights: dict) -> dict:
        """
        Multimodal Gemini call that simultaneously:
          • Analyzes candidate resume images
          • Extracts candidate contact info (name, email, phone)
          • Transcribes resume text for RAG indexing
          • Scores the resume against the JD using the weighted rubric
          • Returns extracted_role, skills, reasoning, full_text

        `images` is a list of PIL.Image.Image objects.
        """
        import google.generativeai as genai
        api_key = gemini_client.get_gemini_api_key()
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY not configured in environment.")
        
        genai.configure(api_key=api_key)
        
        sw = weights
        prompt = f"""
### System Instructions:
You are an advanced Automated Applicant Tracking System (ATS) and Senior Technical Recruiter with vision capabilities. Perform candidate evaluation, text transcription, and data extraction from the CANDIDATE RESUME IMAGES against the provided JOB DESCRIPTION.

### Inputs:
#### Job Description:
{jd_text}

### Tasks:
1. **Resume Transcription**: Perform high-accuracy OCR / transcription of the complete text from all the provided resume images. Capture all bullet points, contact info, headers, and dates verbatim.
2. **Contact Information Extraction**: Extract the candidate's full name, email address, and phone number from the images.
   *CRITICAL CONTACT VALIDATION*: Do NOT extract placeholder, dummy, or redacted contact details (e.g. 'xxx@gmail.com', 'XXX-XXX-XXX', '123-456-7890', 'yourname@example.com', etc.). If the resume lacks actual valid contact details, you MUST return null for that field. Do not hallucinate or assume values.
3. **Role Normalization**: Identify the candidate's primary job title or role from their recent experience.
4. **Scoring & Evaluation**: Score the candidate's resume strictly against the criteria in the job description using the following weight weights:
   - **Skills Matching** (Max: {sw.get('skills', 40)} pts): Evaluate core required technologies/methodologies. Match rate determines the score.
   - **Experience Relevance** (Max: {sw.get('experience', 25)} pts): Assess length of relevant experience, seniority, and matching duties.
   - **Project / Role Alignment** (Max: {sw.get('projects', 20)} pts): Evaluate technical complexity, achievements, scale, and impact in previous roles/projects.
   - **Education Match** (Max: {sw.get('education', 10)} pts): Grade degree levels, fields of study, or relevant industry certifications.
   - **Preferred / Bonus Skills** (Max: {sw.get('bonus', 5)} pts): Look for preferred qualifications or secondary requirements.
   
   *ETHICAL SCORING RULES & DEDUCTIONS*:
   - Critically check for the presence of actual contact details. If a contact detail (like a phone number or email) is completely missing or contains only dummy/placeholder values, apply an incompleteness deduction of **10%** from the overall score to penalize unprofessional resume readiness.
   - Base the component scores strictly and objectively on the candidate's skills relative to the Job Description and the required keywords (if specified in the JD under 'Required Keywords:'). If the candidate lacks essential required skills or experience, grade them rigorously and lower the scores accordingly.
   - *Total Score constraint: The sum of the component scores MUST exactly equal the overall score after any deductions (max 100).*
5. **Experience Extraction**: Extract the candidate's total years of experience as a short string (e.g. "2 Years", "5 Years", "8+ Years", "None").
6. **Certification Match**: If "Additional Requirements / Certifications" are specified in the Job Description, evaluate if the candidate has met these certifications/requirements. Extract a list of matched certifications/requirements. If none are matched or specified, return an empty list.
7. **Candidate Summary**: Generate a short, professional, and concise summary of the candidate's profile and matching status (2-3 lines maximum, suitable for reports).
8. **Location Extraction**: Extract candidate's location (city, state/country or null).
9. **Education Details Extraction**: Extract candidate's highest degree, major, university, and year of graduation as a formatted string (e.g. "B.Tech in CS, Stanford (2022)" or null).

### Output Format:
Return a valid JSON object matching this schema. Do not output any preamble, markdown code blocks, or postamble.
{{
    "name": "Full Name or null",
    "email": "email@example.com or null",
    "phone": "phone number or null",
    "score": <0-100 integer representing the sum of component_scores>,
    "component_scores": {{
        "skills": <0-{sw.get('skills', 40)} integer>,
        "experience": <0-{sw.get('experience', 25)} integer>,
        "projects": <0-{sw.get('projects', 20)} integer>,
        "education": <0-{sw.get('education', 10)} integer>,
        "bonus": <0-{sw.get('bonus', 5)} integer>
    }},
    "key_skills_match": ["Skill A", "Skill B"],
    "missing_skills": ["Skill X", "Skill Y"],
    "reasoning": "Professional explanation details: 1) why the candidate received the matching scores, 2) core strengths, 3) notable gaps relative to requirements, and 4) detail any deductions applied (e.g. for missing/placeholder contact details).",
    "extracted_role": "Normalized job title",
    "full_text": "Complete transcribed text of the resume here.",
    "experience": "Candidate's total experience, e.g. 5 Years or 8+ Years",
    "certification_match": ["AWS Certified", "PMP Certified"],
    "candidate_summary": "Short 2-3 line summary suitable for reports",
    "location": "City, State/Country or null",
    "education_details": "Degree, University (Year) or null"
}}
"""
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction="You are a Senior Technical Recruiter and ATS parser with vision capabilities. Output valid JSON only.",
            generation_config=genai.GenerationConfig(
                temperature=0.1,
                response_mime_type="application/json",
            )
        )
        
        contents = [prompt] + images
        response = model.generate_content(contents)
        content = response.text.strip()
        
        # Clean markdown code blocks if present
        if content.startswith("```"):
            content = content.split("\n", 1)[1] if "\n" in content else content[3:]
        if content.endswith("```"):
            content = content[:-3].strip()
        content = content.replace("```json", "").replace("```", "").strip()
        
        return json.loads(content)

    @staticmethod
    def _get_scoring_weights() -> dict:
        """Fetch scoring weights from DB with a 60-second module-level cache."""
        import time
        now = time.time()
        if RAGService._weights_cache and now - RAGService._weights_cache_ts < 60:
            return RAGService._weights_cache
        default = {"skills": 40, "experience": 25, "projects": 20, "education": 10, "bonus": 5}
        try:
            from database import SessionLocal
            import models
            db = SessionLocal()
            try:
                settings_obj = db.query(models.GlobalSettings).order_by(models.GlobalSettings.id.desc()).first()
                weights = settings_obj.config.get("scoring", default) if settings_obj else default
            finally:
                db.close()
        except Exception as e:
            print(f"[Worker] Could not fetch scoring weights: {e}", flush=True)
            weights = default
        RAGService._weights_cache = weights
        RAGService._weights_cache_ts = now
        return weights

    # Cache attributes (module-level via class)
    _weights_cache: dict | None = None
    _weights_cache_ts: float = 0.0


# ─────────────────────────────────────────────
# RAG: Vector indexing + querying for resumes
# ─────────────────────────────────────────────
import asyncio
import traceback
import uuid as _uuid
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

VECTOR_DIM = 3072  # gemini-embedding-001 (3072-dim, verified available on this key)
_qdrant_client: QdrantClient | None = None


def _get_qdrant() -> QdrantClient:
    global _qdrant_client
    if _qdrant_client is None:
        _qdrant_client = QdrantClient(url=os.getenv("QDRANT_URL", "http://localhost:6333"))
    return _qdrant_client



# ── Embedding via REST v1 (bypasses SDK's broken v1beta gRPC path) ────────────
# google-generativeai <=0.8.x always uses the v1beta gRPC endpoint which does
# NOT expose embedContent for text-embedding-004 or embedding-001.  Calling the
# v1 REST endpoint directly is the only reliable approach with this SDK version.

_EMBED_CANDIDATES = [
    "gemini-embedding-001",   # 3072-dim, latest GA Gemini embedding model
    "gemini-embedding-2",     # alternative if above unavailable
]
_EMBED_MODEL: str | None = None   # cached after first successful probe


def _resolve_embed_model() -> str:
    """
    Probe the Gemini v1 REST API once to find the first available embedding model.
    Result is cached in _EMBED_MODEL for the lifetime of the process.
    """
    global _EMBED_MODEL
    if _EMBED_MODEL:
        return _EMBED_MODEL

    import requests as _req
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set in environment")

    # Fetch the list of available models from v1
    try:
        list_url = f"https://generativelanguage.googleapis.com/v1/models?key={api_key}"
        resp = _req.get(list_url, timeout=10)
        resp.raise_for_status()
        available = {m["name"] for m in resp.json().get("models", [])}
        print(f"[RAG] Available Gemini models: {len(available)} total", flush=True)
    except Exception as e:
        print(f"[RAG] Could not list models: {e} — falling back to text-embedding-004", flush=True)
        available = set()

    for candidate in _EMBED_CANDIDATES:
        full_name = f"models/{candidate}"
        if not available or full_name in available:
            _EMBED_MODEL = candidate
            print(f"[RAG] Selected embedding model: {candidate}", flush=True)
            return _EMBED_MODEL

    # Last resort — try the preferred one anyway
    _EMBED_MODEL = _EMBED_CANDIDATES[0]
    print(f"[RAG] Fallback embedding model: {_EMBED_MODEL}", flush=True)
    return _EMBED_MODEL


def _embed_text_sync(text: str, task_type: str = "RETRIEVAL_DOCUMENT") -> list:
    """
    Call Gemini embedContent via the v1 REST endpoint directly.
    The google-generativeai SDK <=0.8.x only uses v1beta gRPC which doesn't
    support embedContent, so we bypass it entirely with a plain HTTPS request.
    """
    import requests as _req
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set in environment")

    model = _resolve_embed_model()
    url = (
        f"https://generativelanguage.googleapis.com/v1/models/"
        f"{model}:embedContent?key={api_key}"
    )
    payload = {
        "model": f"models/{model}",
        "content": {"parts": [{"text": text}]},
        "taskType": task_type,
    }
    resp = _req.post(url, json=payload, timeout=30)
    resp.raise_for_status()
    return resp.json()["embedding"]["values"]


async def _embed_text(text: str, task_type: str = "RETRIEVAL_DOCUMENT") -> list:
    return await asyncio.to_thread(_embed_text_sync, text, task_type)



def _chunk_text_overlap(text: str, chunk_size: int = 800, overlap: int = 150) -> list:
    """Split text into overlapping chunks of chunk_size with overlap."""
    if len(text) <= chunk_size:
        return [text]
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        if len(chunk) > 50:
            chunks.append(chunk)
        start += chunk_size - overlap
    return chunks


def _chunk_resume(full_text: str, candidate_id: int) -> list:
    """Split resume plain text into semantic section chunks and overlapping sliding windows for indexing."""
    chunks = []
    text = full_text.strip()
    if not text:
        return chunks

    # 1. Full text anchor (capped at 3000 chars)
    chunks.append({"field": "full", "text": text[:3000]})

    # 2. Header chunk (first 600 chars: name, contact, summary)
    if len(text) > 100:
        chunks.append({"field": "header", "text": text[:600]})

    # 3. Section-based chunking via common headings
    section_patterns = {
        "skills": r"(?i)^(skills?|technical skills?|core competencies|technologies|tech stack|key skills)[\s:]*$",
        "experience": r"(?i)^(experience|work experience|employment|work history|professional experience|career history)[\s:]*$",
        "education": r"(?i)^(education|academic|qualification|degrees?)[\s:]*$",
        "projects": r"(?i)^(projects?|portfolio|personal projects|work samples|key projects)[\s:]*$",
    }

    lines = text.split('\n')
    current_section = None
    section_lines: list = []
    sections = {}

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        matched_section = None
        for sec_name, pattern in section_patterns.items():
            if re.match(pattern, stripped):
                matched_section = sec_name
                break

        if matched_section:
            if current_section and len(section_lines) > 0:
                sections[current_section] = '\n'.join(section_lines)
            current_section = matched_section
            section_lines = []
        elif current_section:
            section_lines.append(stripped)

    # Flush last section
    if current_section and len(section_lines) > 0:
        sections[current_section] = '\n'.join(section_lines)

    # Process sections into sub-chunks with overlap
    for sec_name, sec_text in sections.items():
        sub_chunks = _chunk_text_overlap(sec_text, chunk_size=800, overlap=150)
        for idx, sub_text in enumerate(sub_chunks):
            chunks.append({"field": f"{sec_name}_{idx}", "text": sub_text})

    # 4. General character-based sliding-window chunks fallback over entire document
    all_sliding = _chunk_text_overlap(text, chunk_size=1000, overlap=200)
    for idx, sub_text in enumerate(all_sliding):
        chunks.append({"field": f"sliding_{idx}", "text": sub_text})

    return chunks


def _make_point_id(candidate_id: int, field: str, text: str = "") -> str:
    import hashlib
    text_hash = hashlib.md5(text.encode('utf-8')).hexdigest() if text else ""
    return str(_uuid.uuid5(_uuid.NAMESPACE_DNS, f"{candidate_id}:{field}:{text_hash}"))


class RagIndexingService:

    @staticmethod
    def _collection_name(user_id: int) -> str:
        return f"resumes_{user_id}"

    @staticmethod
    def _ensure_collection(client: QdrantClient, collection_name: str) -> None:
        existing = [c.name for c in client.get_collections().collections]
        if collection_name not in existing:
            client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(size=VECTOR_DIM, distance=Distance.COSINE)
            )

    @staticmethod
    def delete_collection(user_id: int) -> None:
        try:
            client = _get_qdrant()
            collection_name = RagIndexingService._collection_name(user_id)
            existing = [c.name for c in client.get_collections().collections]
            if collection_name in existing:
                client.delete_collection(collection_name=collection_name)
                print(f"[RAG] Collection {collection_name} deleted.", flush=True)
        except Exception as e:
            print(f"[RAG] Failed to delete collection for user {user_id}: {e}", flush=True)

    @staticmethod
    def delete_candidate_vectors(candidate_id: int, user_id: int) -> bool:
        """Remove all Qdrant vectors for a single candidate without touching others."""
        try:
            from qdrant_client.models import Filter, FieldCondition, MatchValue
            client = _get_qdrant()
            collection_name = RagIndexingService._collection_name(user_id)
            existing = [c.name for c in client.get_collections().collections]
            if collection_name not in existing:
                return True
            client.delete(
                collection_name=collection_name,
                points_selector=Filter(
                    must=[FieldCondition(key="candidate_id", match=MatchValue(value=candidate_id))]
                )
            )
            print(f"[RAG] Deleted vectors for candidate {candidate_id} from {collection_name}", flush=True)
            return True
        except Exception as e:
            print(f"[RAG] Failed to delete vectors for candidate {candidate_id}: {e}", flush=True)
            return False

    @staticmethod
    async def index_candidate(candidate_id: int, user_id: int, full_text: str) -> bool:
        """Chunk, embed, and upsert a candidate's resume into Qdrant."""
        try:
            print(f"[RAG] index_candidate: candidate={candidate_id} user={user_id} text_len={len(full_text)}", flush=True)
            chunks = _chunk_resume(full_text, candidate_id)
            if not chunks:
                print(f"[RAG] No chunks produced for candidate {candidate_id}", flush=True)
                return False

            print(f"[RAG] Embedding {len(chunks)} chunks for candidate {candidate_id}...", flush=True)
            embeddings = await asyncio.gather(
                *[_embed_text(c["text"], "RETRIEVAL_DOCUMENT") for c in chunks]
            )
            print(f"[RAG] Embeddings done for candidate {candidate_id}", flush=True)

            collection_name = RagIndexingService._collection_name(user_id)
            client = _get_qdrant()
            print(f"[RAG] Ensuring Qdrant collection: {collection_name}", flush=True)
            await asyncio.to_thread(
                RagIndexingService._ensure_collection, client, collection_name
            )

            points = [
                PointStruct(
                    id=_make_point_id(candidate_id, chunks[i]["field"], chunks[i]["text"]),
                    vector=embeddings[i],
                    payload={
                        "candidate_id": candidate_id,
                        "user_id": user_id,
                        "field": chunks[i]["field"],
                        "text": chunks[i]["text"],
                    }
                )
                for i in range(len(chunks))
            ]

            await asyncio.to_thread(
                client.upsert,
                collection_name=collection_name,
                points=points
            )
            print(f"[RAG] ✓ Indexed candidate {candidate_id} ({len(points)} chunks) into {collection_name}", flush=True)
            return True
        except Exception:
            print(f"[RAG] ✗ Indexing failed for candidate {candidate_id}:\n{traceback.format_exc()}", flush=True)
            return False


class RagQueryService:

    @staticmethod
    async def query_candidates(
        query_text: str,
        user_id: int,
        conversation_history: list | None = None,
        candidate_names_map: dict | None = None,
    ) -> dict:
        """Semantic search over candidate resumes, synthesize answer with Gemini."""
        collection_name = f"resumes_{user_id}"
        client = _get_qdrant()

        # Check collection exists
        try:
            existing_names = [c.name for c in (await asyncio.to_thread(client.get_collections)).collections]
        except Exception:
            existing_names = []

        if collection_name not in existing_names:
            return {
                "answer": "No resumes have been indexed yet. Please screen some resumes first, then wait for the worker to index them.",
                "sources_count": 0,
                "source_candidate_ids": []
            }

        # 1. Candidate Name Pre-filtering
        from qdrant_client.models import Filter, FieldCondition, MatchValue
        matched_ids = []
        lower_query = query_text.lower()
        for cid, name in (candidate_names_map or {}).items():
            name_lower = name.lower()
            name_parts = name_lower.split()
            # Match if full name or any distinct name part is in the query text
            if name_lower in lower_query or any(len(part) > 2 and part in lower_query for part in name_parts):
                matched_ids.append(cid)

        qdrant_filter = None
        if matched_ids:
            if len(matched_ids) == 1:
                qdrant_filter = Filter(
                    must=[FieldCondition(key="candidate_id", match=MatchValue(value=matched_ids[0]))]
                )
            else:
                qdrant_filter = Filter(
                    should=[FieldCondition(key="candidate_id", match=MatchValue(value=cid)) for cid in matched_ids]
                )
            print(f"[RAG] Narrowing search to candidates: {matched_ids}", flush=True)

        # 2. Vector Search (Single Query, 1 Embedding Call)
        query_vector = await _embed_text(query_text, "RETRIEVAL_QUERY")

        search_results = await asyncio.to_thread(
            client.search,
            collection_name=collection_name,
            query_vector=query_vector,
            query_filter=qdrant_filter,
            limit=10
        )

        if not search_results:
            # If candidate name filtering was active, we may have no vector match, but can still answer using DB directory
            print(f"[RAG] No vector match for query: {query_text}", flush=True)

        # Build context from retrieved chunks — use names if provided
        context_parts = []
        source_ids = []
        for hit in search_results:
            payload = hit.payload or {}
            cid = payload.get("candidate_id")
            if cid and cid not in source_ids:
                source_ids.append(cid)
            name = (candidate_names_map or {}).get(cid, f"Candidate {cid}")
            context_parts.append(
                f"[{name} — {payload.get('field', 'resume')}]\n{payload.get('text', '')}"
            )
        context = "\n\n---\n\n".join(context_parts)

        # 3. Structured Database Context Integration (Hybrid Search)
        directory_context = ""
        try:
            from database import SessionLocal
            import models
            db = SessionLocal()
            try:
                # Retrieve all candidates owned by this user
                db_candidates = db.query(models.Candidate).filter(
                    models.Candidate.created_by == user_id
                ).all()
                if db_candidates:
                    dir_lines = ["#### Candidate Directory (Structured Database Records):"]
                    for c in db_candidates:
                        exp = c.analysis_data.get("experience", "N/A") if c.analysis_data and isinstance(c.analysis_data, dict) else "N/A"
                        dir_lines.append(
                            f"- Name: {c.name} | Role: {c.role} | Score: {c.score or 0.0} | "
                            f"Status: {c.status} | Stage: {c.stage} | Exp: {exp}"
                        )
                    directory_context = "\n".join(dir_lines)
            finally:
                db.close()
        except Exception as e:
            print(f"[RAG] Failed to build candidate directory context: {e}", flush=True)

        # Append last 6 conversation turns
        history_str = ""
        if conversation_history:
            for msg in conversation_history[-6:]:
                role = "HR" if msg.get("role") == "user" else "Assistant"
                history_str += f"{role}: {msg.get('content', '')}\n"

        prompt = f"""
### System Instructions:
You are an expert AI Recruiting Partner. Your task is to provide objective, precise, and fact-based answers to the HR manager's question.

You have access to two context sources:
1. **Candidate Directory**: A structured list of candidate records currently in the database (names, roles, overall scores, status, stage, years of experience). Use this directory to answer quantitative, ranking, comparative, or status-based questions (e.g. "Who has a score above 80?", "Which candidates are hired?").
2. **Resume Contexts**: Semantic segments of the candidates' resume text retrieved from the vector index. Use these segments to answer detailed questions about projects, experience details, and specific skills.

### Contexts:
{directory_context}

---

#### Resume Contexts:
{context}

#### Conversation History:
{history_str}

### Question:
HR Manager's Inquiry: {query_text}

### Constraints & Formatting Guidelines:
1. **Source Fidelity**: Rely ONLY on the facts present in the provided contexts. Do not extrapolate, assume, or speculate.
2. **Identification**: Refer to candidates exclusively by their full name (never by ID numbers or index).
3. **Format**: Use clean markdown structure:
   - Bold candidate names and key technical skills (e.g., **Python**, **React**).
   - Use bullet points for structured listings or comparative bulleted summaries.
   - Use section headings (`###`) to divide longer comparative or detailed evaluations.
4. **Tone**: Be professional, direct, objective, and action-oriented.
5. **Missing Information**: If the contexts do not contain enough facts to answer the question, state that clearly and specify what details are missing.

### Answer:
"""

        try:
            from . import gemini_client
            answer = gemini_client.call_gemini_text(
                prompt=prompt,
                system_prompt="You are a professional Recruiting Partner. Reference specific candidates from context. Be concise and factual.",
                temperature=0.3
            )
        except Exception as e:
            print(f"[RAG] ✗ Query synthesis failed: {e}\n{traceback.format_exc()}", flush=True)
            answer = f"Could not generate answer: {e}"

        source_names = [
            (candidate_names_map or {}).get(cid, f"Candidate {cid}")
            for cid in source_ids
        ]
        return {
            "answer": answer,
            "sources_count": len(search_results),
            "source_candidate_ids": source_ids,
            "source_candidate_names": source_names,
        }
