import os
import json
import re
import io
from typing import List

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from PIL import Image
from dotenv import load_dotenv
import google.generativeai as genai

from app.controllers.auth_controller import get_current_user

# Load environment
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-2.5-flash")

router = APIRouter(prefix="/medicines", tags=["medicines"])

# ===============================
# HELPERS
# ===============================
def _clean_json(text: str) -> str:
    text = re.sub(r"```json", "", text)
    text = re.sub(r"```", "", text)
    return text.strip()


def _extract_from_image(image: Image.Image) -> List[dict]:
    if not GEMINI_API_KEY:
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

IMPORTANT: Return ONLY the JSON array. No other text.
"""

    try:
        response = model.generate_content([prompt, image])
        response_text = response.text
        cleaned = _clean_json(response_text)
        medicines = json.loads(cleaned)
        
        if not isinstance(medicines, list):
            medicines = [medicines]
        
        return medicines
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {str(e)}")
        return []
    except Exception as e:
        print(f"Error extracting from image: {str(e)}")
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

        validated.append({
            "name": med.get("name", ""),
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
            print(f"Error processing image: {str(e)}")
            return []

    # PDF - Using PyMuPDF (fitz)
    if ext == "pdf":
        try:
            import fitz  # PyMuPDF
            
            # Open PDF from bytes
            pdf_document = fitz.open(stream=file_bytes, filetype="pdf")
            
            if pdf_document.page_count == 0:
                print("PDF has no pages")
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
                    print(f"Error processing PDF page {page_num + 1}: {str(e)}")
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
            print(f"Error converting PDF: {str(e)}")
            return []

    return []


# ===============================
# ENDPOINTS
# ===============================


@router.get("")
def list_medicines(user=Depends(get_current_user)):
    """List medicines for the current user. Placeholder until stored in DB."""
    return []


@router.post("/extract-file")
async def extract_prescription(file: UploadFile = File(...)):
    """Extract medicines from prescription image or PDF"""
    try:
        # Check if Gemini API key is configured
        if not GEMINI_API_KEY:
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
        print(f"Unexpected error in extract_prescription: {str(e)}")
        import traceback
        traceback.print_exc()
        
        raise HTTPException(
            status_code=500, 
            detail=f"Error processing file: {str(e)}"
        )
