
import os
import requests

# Judge0 CE public instance (free, no API key required)
DEFAULT_API_URL = "https://ce.judge0.com/submissions"

# Language Mapping (Frontend/Internal -> Judge0 language_id)
LANGUAGE_MAP = {
    "javascript": {"language_id": 63},
    "python": {"language_id": 71},
    "python3": {"language_id": 71},
    "java": {"language_id": 62},
    "cpp": {"language_id": 54},
    "c": {"language_id": 50},
    "go": {"language_id": 60}
}

def execute_code(language_key: str, code: str, stdin: str = ""):
    """
    Executes code using Judge0 CE API.
    """
    config = LANGUAGE_MAP.get(language_key)
    if not config:
        return {"error": f"Unsupported language: {language_key}"}

    api_url = os.getenv("JUDGE0_API_URL", DEFAULT_API_URL)

    headers = {
        "Content-Type": "application/json"
    }

    payload = {
        "source_code": code,
        "language_id": config["language_id"],
        "stdin": stdin or "",
        "cpu_time_limit": 5,
        "wall_time_limit": 10,
        "memory_limit": 128000
    }

    print(f"[Judge0] Executing language_id={config['language_id']} on {api_url}")

    try:
        # Synchronous execution: wait=true returns result directly
        response = requests.post(
            f"{api_url}?wait=true",
            json=payload,
            headers=headers,
            timeout=30
        )
        response.raise_for_status()
        result = response.json()

        stdout = result.get("stdout") or ""
        stderr = result.get("stderr") or ""
        compile_output = result.get("compile_output") or ""

        status_obj = result.get("status", {})
        status_id = status_obj.get("id", 0)
        status_desc = status_obj.get("description", "Unknown")

        print(f"[Judge0] Status: {status_id} - {status_desc}")

        # Status 6 = Compilation Error
        if status_id == 6:
            return {
                "status": "error",
                "output": compile_output or "Compilation Failed",
                "raw": result
            }

        # Status 7-12 = Runtime Errors
        if 7 <= status_id <= 12:
            return {
                "status": "failed",
                "output": stderr or stdout or status_desc,
                "raw": result
            }

        # Status 5 = Time Limit Exceeded
        if status_id == 5:
            return {
                "status": "failed",
                "output": "Time Limit Exceeded",
                "raw": result
            }

        # Status 3 = Accepted, Status 4 = Wrong Answer
        if status_id in (3, 4):
            return {
                "status": "success",
                "output": stdout or stderr,
                "raw": result
            }

        # Fallback
        return {
            "status": "service_error",
            "output": f"Judge0 status: {status_desc}. {stderr or compile_output or stdout}",
            "raw": result
        }

    except requests.HTTPError as e:
        resp = e.response
        response_text = ""
        if resp is not None:
            try:
                response_text = resp.text.strip()
            except Exception:
                response_text = ""

        message = f"Judge0 API returned HTTP {resp.status_code if resp else 'unknown'}"
        if response_text:
            message = f"{message}: {response_text[:300]}"

        print(f"[Judge0] Execution Error: {message}")
        return {
            "status": "service_error",
            "output": message,
            "raw": {"status_code": resp.status_code if resp else None, "body": response_text},
        }
    except Exception as e:
        print(f"[Judge0] Execution Error: {e}")
        return {
            "status": "service_error",
            "output": str(e),
            "raw": {}
        }
