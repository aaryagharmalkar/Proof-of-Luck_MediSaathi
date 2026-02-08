import json
import logging
import re
import io
from typing import List, Optional
from datetime import date

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from PIL import Image
import google.generativeai as genai

from app.config import settings
from app.supabase_client import supabase
from app.controllers.auth_controller import get_current_user
from app.rag_store import store_patient_document

if (settings.gemini_api_key or "").strip():
    genai.configure(api_key=settings.gemini_api_key)

logger = logging.getLogger(__name__)

# List of models to try in order of preference (Lite models first for better quota)
FALLBACK_MODELS = [
    "gemini-2.0-flash-lite-001",
    "gemini-2.0-flash-lite",
    "gemini-2.5-flash-lite",
    "gemini-flash-latest",
    "gemini-2.5-flash"
]

router = APIRouter(prefix="/medicines", tags=["medicines"])

# ===============================
# MODELS
# ===============================

class MedicineCreate(BaseModel):
    name: str
    dosage: Optional[str] = None
    form: Optional[str] = "tablet"
    frequency: Optional[str] = "Daily"
    intake_times: Optional[List[str]] = []
    custom_times: Optional[List[str]] = []
    dose_count: Optional[float] = 1
    unit: Optional[str] = "tablet"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    quantity_current: Optional[float] = None
    quantity_unit: Optional[str] = None
    refill_reminder_days: Optional[int] = None
    is_critical: bool = False
    is_active: bool = True
    notes: Optional[str] = None
    member_id: Optional[str] = None  # If None, medicine is for the logged-in user


class MedicineUpdate(BaseModel):
    name: Optional[str] = None
    dosage: Optional[str] = None
    form: Optional[str] = None
    frequency: Optional[str] = None
    intake_times: Optional[List[str]] = None
    custom_times: Optional[List[str]] = None
    dose_count: Optional[float] = None
    unit: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    quantity_current: Optional[float] = None
    quantity_unit: Optional[str] = None
    refill_reminder_days: Optional[int] = None
    is_critical: Optional[bool] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None

class MedicineInfoRequest(BaseModel):
    name: str

# ===============================
# HELPERS
# ===============================
def _clean_json(text: str) -> str:
    text = re.sub(r"```json", "", text)
    text = re.sub(r"```", "", text)
    return text.strip()


def _extract_from_image(image: Image.Image) -> List[dict]:
    if not (settings.gemini_api_key or "").strip():
        raise RuntimeError("GEMINI_API_KEY not configured")

    prompt = """
You are a medical prescription extraction system. Analyze this prescription image carefully.

Extract ALL medicines visible in the prescription and return ONLY valid JSON.
No markdown. No explanations. No code blocks.

The JSON MUST strictly follow this structure:

[
  {
  "name": string (medicine name),
  "type": string (one of: "tablet", "syrup", "other"),
  "intakeTimes": [string] (array of: "Before Breakfast", "After Breakfast", "Before Lunch", "After Lunch", "Before Dinner", "After Dinner"),
  "customTimes": [string] (array of time strings in HH:MM format),
  "frequency": string (one of: "Daily", "Alternate Days"),
  "doseCount": number (tablets count or ml for syrup, default 1 for tablet, 5 for syrup),
  "isCritical": boolean (is this a critical medication),
  "durationDays": number (duration in days)
}
]

EXTRACTION RULES:

1. MEDICINE NAME:
   - Extract the exact medicine name as written
   - Include strength/dosage in the name (e.g., "Paracetamol 500mg")
   - Do NOT split combination drugs into separate medicines

2. MEDICINE TYPE:
   - "tablet" for tablets, capsules, pills
   - "syrup" for syrups, suspensions, liquids
   - "other" for injections, drops, ointments, inhalers, etc.

3. INTAKE TIMES (intakeTimes) - CRITICAL RULES:
   - You MUST use ONLY these EXACT strings (case-sensitive):
     * "Before Breakfast"
     * "After Breakfast"
     * "Before Lunch"
     * "After Lunch"
     * "Before Dinner"
     * "After Dinner"
   
   - DO NOT use any other variations or wordings
   - Example: "OD" or "morning" should be "After Breakfast"
   - Example: "BD" might be "After Breakfast" and "After Dinner"
   - Example: "TDS" (three times) might be "After Breakfast", "After Lunch", "After Dinner"

4. CUSTOM TIMES:
   - If specific times like "08:00", "14:30" are mentioned, add them to customTimes array
   - Times should be in HH:MM 24-hour format
   - Keep customTimes separate from intakeTimes

5. FREQUENCY:
   - "Daily" for everyday medication
   - "Alternate Days" for alternate day medications
   - Default to "Daily" if not specified

6. DOSE COUNT:
   - For tablets: count of tablets (default 1)
   - For syrups: milliliters (default 5)
   - Extract as number. If range is given (e.g., "1-2"), use the average

7. CRITICAL MEDICATIONS:
   - Mark as true for: antibiotics, anticoagulants, insulins, anticonvulsants, cardiac drugs
   - Mark as false for others
   - Default to false

8. DURATION:
   - Extract duration in DAYS
   - If given in weeks (e.g., "2 weeks"), convert to days (14 days)
   - If given in months, use 30 days per month
   - Default to 7 days if not specified

IMPORTANT: Return ONLY the JSON array. No other text. If the image is not a prescription or no medicines are visible, return [].
"""

    safety_settings = [
        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
    ]

    for model_name in FALLBACK_MODELS:
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(
                [prompt, image],
                safety_settings=safety_settings,
            )
            if not response or not response.text:
                continue
            response_text = response.text
            cleaned = _clean_json(response_text)
            medicines = json.loads(cleaned)
            if not isinstance(medicines, list):
                medicines = [medicines]
            return medicines
        except json.JSONDecodeError as e:
            logger.warning("JSON decode error (model %s): %s", model_name, e)
            continue
        except Exception as e:
            logger.warning("Error extracting from image (model %s): %s", model_name, e)
            continue

    logger.warning("All models failed for prescription image extraction")
    return []


def _validate_and_fix_medicines(medicines: List[dict]) -> List[dict]:
    validated = []

    for med in medicines:
        # Validate and fix medicine type
        med_type = med.get("type", "tablet").lower()
        if med_type not in ["tablet", "syrup", "other"]:
            med_type = "tablet"

        # Validate and fix dose count
        try:
            dose_count = float(med.get("doseCount", 1))
        except (ValueError, TypeError):
            dose_count = 1

        # Apply rounding rules
        if med_type == "tablet":
            dose_count = round(dose_count)
            if dose_count < 1:
                dose_count = 1
        elif med_type == "syrup":
            # Round to nearest multiple of 5
            dose_count = max(5, round(dose_count / 5) * 5)
        else:
            # Other types: whole numbers
            dose_count = round(dose_count)
            if dose_count < 1:
                dose_count = 1

        # VALIDATE AND FIX INTAKE TIMES
        valid_intake_times = [
            "Before Breakfast", "After Breakfast",
            "Before Lunch", "After Lunch",
            "Before Dinner", "After Dinner"
        ]
        
        intake_times = med.get("intakeTimes", [])
        cleaned_intake_times = []
        
        for time in intake_times:
            # Check if it's already a valid time
            if time in valid_intake_times:
                cleaned_intake_times.append(time)
            else:
                # Try to fix common variations (case-insensitive matching)
                time_lower = time.lower()
                if "before breakfast" in time_lower or "before bf" in time_lower:
                    cleaned_intake_times.append("Before Breakfast")
                elif "after breakfast" in time_lower or "after bf" in time_lower or "morning" in time_lower:
                    cleaned_intake_times.append("After Breakfast")
                elif "before lunch" in time_lower:
                    cleaned_intake_times.append("Before Lunch")
                elif "after lunch" in time_lower or "afternoon" in time_lower or "noon" in time_lower:
                    cleaned_intake_times.append("After Lunch")
                elif "before dinner" in time_lower:
                    cleaned_intake_times.append("Before Dinner")
                elif "after dinner" in time_lower or "evening" in time_lower or "night" in time_lower:
                    cleaned_intake_times.append("After Dinner")
        
        # Remove duplicates while preserving order
        cleaned_intake_times = list(dict.fromkeys(cleaned_intake_times))

        # Force frequency to be only "Daily" or "Alternate Days"
        frequency = med.get("frequency", "Daily")
        if frequency not in ["Daily", "Alternate Days"]:
            frequency = "Daily"

        name = (med.get("name") or "").strip()
        if not name:
            continue
        validated.append({
            "name": name,
            "type": med_type,
            "intakeTimes": cleaned_intake_times,
            "customTimes": med.get("customTimes", []),
            "frequency": frequency,
            "doseCount": dose_count,
            "isCritical": med.get("isCritical", False),
            "durationDays": med.get("durationDays", 7)
        })

    return validated


def extract_medicines(file_bytes: bytes, filename: str) -> List[dict]:
    """Extract medicines from image or PDF file"""
    ext = filename.lower().split(".")[-1]
    all_medicines = []

    # IMAGE
    if ext in ["jpg", "jpeg", "png"]:
        try:
            image = Image.open(io.BytesIO(file_bytes))
            medicines = _extract_from_image(image)
            return _validate_and_fix_medicines(medicines)
        except Exception as e:
            logger.warning("Error processing image: %s", e)
            return []

    # PDF - Using PyMuPDF (fitz)
    if ext == "pdf":
        try:
            import fitz  # PyMuPDF
            
            # Open PDF from bytes
            pdf_document = fitz.open(stream=file_bytes, filetype="pdf")
            
            if pdf_document.page_count == 0:
                logger.warning("PDF has no pages")
                pdf_document.close()
                return []
            
            # Process each page
            for page_num in range(pdf_document.page_count):
                try:
                    page = pdf_document[page_num]
                    
                    # Convert page to image (PNG format)
                    # zoom=2 gives 200 DPI (1=100 DPI, 2=200 DPI)
                    mat = fitz.Matrix(2, 2)
                    pix = page.get_pixmap(matrix=mat)
                    
                    # Convert pixmap to PIL Image
                    img_bytes = pix.tobytes("png")
                    image = Image.open(io.BytesIO(img_bytes))
                    
                    # Extract medicines from this page
                    meds = _extract_from_image(image)
                    all_medicines.extend(meds)
                    
                except Exception as e:
                    logger.warning("Error processing PDF page %s: %s", page_num + 1, e)
                    continue
            
            pdf_document.close()
            
            # Deduplicate by name
            unique = {}
            for med in all_medicines:
                if med.get("name"):
                    unique[med["name"].lower()] = med

            medicines = list(unique.values())
            return _validate_and_fix_medicines(medicines)
            
        except Exception as e:
            logger.warning("Error converting PDF: %s", e)
            return []

    return []


# ===============================
# PYDANTIC MODELS
# ===============================


class MedicineCreate(BaseModel):
    member_id: Optional[str] = None
    name: str
    dosage: Optional[str] = None
    form: Optional[str] = None
    frequency: Optional[str] = None
    intake_times: Optional[List[str]] = None
    custom_times: Optional[List[str]] = None
    dose_count: Optional[float] = 1
    unit: Optional[str] = "tablet"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    quantity_current: Optional[float] = None
    quantity_unit: Optional[str] = None
    refill_reminder_days: Optional[int] = None
    is_critical: bool = False
    is_active: bool = True
    daily_status: Optional[dict] = None
    notes: Optional[str] = None


class MedicineUpdate(BaseModel):
    name: Optional[str] = None
    dosage: Optional[str] = None
    form: Optional[str] = None
    frequency: Optional[str] = None
    intake_times: Optional[List[str]] = None
    custom_times: Optional[List[str]] = None
    dose_count: Optional[float] = None
    unit: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    quantity_current: Optional[float] = None
    quantity_unit: Optional[str] = None
    refill_reminder_days: Optional[int] = None
    is_critical: Optional[bool] = None
    is_active: Optional[bool] = None
    daily_status: Optional[dict] = None
    notes: Optional[str] = None


def _ensure_member_belongs_to_user(user_id: str, member_id: Optional[str]) -> None:
    if not member_id:
        return
    res = supabase.table("members").select("id").eq("id", member_id).eq("user_id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Invalid member_id or not your family member")


# ===============================
# ENDPOINTS
# ===============================


@router.get("")
async def list_medicines(
    current_user=Depends(get_current_user),
    member_id: Optional[str] = Query(None, description="Filter by family member; omit for 'Me'"),
    active_only: bool = Query(True, description="Only active medicines"),
):
    """List medicines for the current user, optionally for a family member. Removes from DB any whose end_date is past (dosage complete)."""
    try:
        today = date.today().isoformat()
        # Remove completed courses (end_date in the past) from the database for this user
        try:
            supabase.table("medicines").delete().eq("user_id", current_user.id).lt("end_date", today).execute()
        except Exception:
            pass  # ignore cleanup errors (e.g. no end_date or no rows)
        q = supabase.table("medicines").select("*").eq("user_id", current_user.id)
        if member_id and str(member_id).strip().lower() not in ("", "me", "null"):
            q = q.eq("member_id", member_id)
        else:
            q = q.is_("member_id", "null")
        if active_only:
            q = q.eq("is_active", True)
        res = q.order("created_at", desc=True).execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def create_medicine(payload: MedicineCreate, current_user=Depends(get_current_user)):
    """Add a medicine (for self or a family member)."""
    try:
        _ensure_member_belongs_to_user(current_user.id, payload.member_id)
        data = {
            "user_id": current_user.id,
            "member_id": payload.member_id if payload.member_id else None,
            "name": payload.name,
            "dosage": payload.dosage,
            "form": payload.form,
            "frequency": payload.frequency,
            "intake_times": payload.intake_times or [],
            "custom_times": payload.custom_times or [],
            "dose_count": payload.dose_count,
            "unit": payload.unit,
            "start_date": payload.start_date,
            "end_date": payload.end_date,
            "quantity_current": payload.quantity_current,
            "quantity_unit": payload.quantity_unit,
            "refill_reminder_days": payload.refill_reminder_days,
            "is_critical": payload.is_critical,
            "is_active": payload.is_active,
            "daily_status": payload.daily_status or {},
            "notes": payload.notes,
        }
        res = supabase.table("medicines").insert(data).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to create medicine")
        try:
            created = res.data[0]
            summary = (
                f"Prescription: {created.get('name')} "
                f"({created.get('dosage') or 'dosage not specified'}), "
                f"{created.get('frequency') or 'frequency not specified'}. "
                f"Form: {created.get('form') or 'unspecified'}. "
                f"Notes: {created.get('notes') or 'none'}."
            )
            store_patient_document(
                user_id=current_user.id,
                member_id=created.get("member_id"),
                content=summary,
                metadata={
                    "source": "prescription",
                    "medicine_id": created.get("id"),
                },
            )
        except Exception:
            pass
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{medicine_id}")
async def get_medicine(medicine_id: str, current_user=Depends(get_current_user)):
    """Get a specific medicine by ID."""
    try:
        result = supabase.table("medicines").select("*").eq("id", medicine_id).eq("user_id", current_user.id).maybe_single().execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Medicine not found")
        return result.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{medicine_id}")
async def update_medicine(medicine_id: str, payload: MedicineUpdate, current_user=Depends(get_current_user)):
    """Update a medicine (partial)."""
    try:
        existing = supabase.table("medicines").select("id").eq("id", medicine_id).eq("user_id", current_user.id).maybe_single().execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Medicine not found")
        update_data = payload.model_dump(exclude_unset=True)
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        res = supabase.table("medicines").update(update_data).eq("id", medicine_id).eq("user_id", current_user.id).execute()
        return res.data[0] if res.data else {}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{medicine_id}")
async def delete_medicine(medicine_id: str, current_user=Depends(get_current_user)):
    """Delete a medicine (e.g. when course is complete or user removes it)."""
    try:
        res = supabase.table("medicines").delete().eq("id", medicine_id).eq("user_id", current_user.id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Medicine not found")
        return {"ok": True, "deleted": medicine_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class MedicineInfoRequest(BaseModel):
    name: str

@router.post("/info")
async def get_medicine_info(
    request: MedicineInfoRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Get detailed information about a medicine using Gemini AI.
    """
    if not (settings.gemini_api_key or "").strip():
        raise HTTPException(status_code=500, detail="Gemini API key not configured")

    prompt = f"""
    You are a medical assistant. Provide detailed information about the medicine "{request.name}". 
    Include the following fields in JSON format:
    - uses: List of common uses.
    - side_effects: List of common side effects.
    - warnings: Important warnings or contraindications (e.g., allergies, pregnancy).
    - dietary_restrictions: Any food or drink to avoid.
    - usage_instructions: General advice on how to take it (e.g., with food).

    Return ONLY raw JSON, no markdown.
    """
    
    last_exception = None
    
    # Try each model in the fallback list
    for model_name in FALLBACK_MODELS:
        try:
            logger.debug("Attempting with model: %s", model_name)
            current_model = genai.GenerativeModel(model_name)
            
            # Relax safety settings for medical context
            response = current_model.generate_content(
                prompt,
                safety_settings=[
                    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
                    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                ]
            )
            
            try:
                text = response.text
                cleaned_json = _clean_json(text)
                data = json.loads(cleaned_json)
                return data # Success!
            except ValueError:
                logger.debug("Model %s blocked response", model_name)
                continue # Try next model
                
        except Exception as e:
            error_msg = str(e)
            logger.warning("Model %s failed: %s", model_name, error_msg)
            last_exception = e
            # If 429 (Quota) or 404 (Not Found), we continue to next model
            if "429" in error_msg or "Quota" in error_msg or "404" in error_msg:
                continue
            # For other errors, we might stop or continue. Let's continue to be safe.
            continue
            
    logger.warning("All models failed for prescription extraction")
    error_detail = str(last_exception) if last_exception else "All AI models are currently busy or unavailable."
    
    # If it was a quota error, ensure we send 429 back so frontend shows the friendly limits message
    if last_exception and ("429" in str(last_exception) or "Quota" in str(last_exception) or "limit" in str(last_exception)):
         raise HTTPException(status_code=429, detail="Daily AI Limit Reached")
         
    raise HTTPException(status_code=500, detail=f"AI Error: {error_detail}")


@router.post("/extract-file")
async def extract_prescription(file: UploadFile = File(...)):
    """Extract medicines from prescription image or PDF"""
    try:
        # Check if Gemini API key is configured
        if not (settings.gemini_api_key or "").strip():
            raise HTTPException(
                status_code=500,
                detail="Prescription extraction service is not configured (GEMINI_API_KEY missing)"
            )
        
        # Validate file type
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")
        
        ext = file.filename.lower().split(".")[-1]
        if ext not in ["jpg", "jpeg", "png", "pdf"]:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported file type: {ext}. Only JPG, PNG, and PDF are supported."
            )
        
        # Read file with size limit (10MB)
        MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
        file_bytes = await file.read()
        
        if len(file_bytes) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is 10MB."
            )
        
        if len(file_bytes) == 0:
            raise HTTPException(status_code=400, detail="Empty file uploaded")

        medicines = extract_medicines(file_bytes, file.filename)

        if not medicines:
            return JSONResponse(
                content={
                    "success": False,
                    "message": "No valid medicines detected. Please ensure the image/PDF is clear and contains a prescription.",
                    "medicines": []
                },
                status_code=200
            )

        return JSONResponse(
            content={
                "success": True,
                "message": f"Successfully extracted {len(medicines)} medicine(s)",
                "medicines": medicines
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unexpected error in extract_prescription")
        raise HTTPException(
            status_code=500, 
            detail=f"Error processing file: {str(e)}"
        )
