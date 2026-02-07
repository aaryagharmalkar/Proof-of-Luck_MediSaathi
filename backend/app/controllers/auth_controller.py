from fastapi import HTTPException, Header
from datetime import datetime
from app.supabase_client import supabase


async def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="No token provided")

    try:
        token = authorization.split(" ")[1]

        res = supabase.auth.get_user(token)

        if not res or not res.user:
            raise HTTPException(status_code=401, detail="Invalid token")

        return res.user

    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def signup_user(email: str, password: str, name: str | None = None):
    try:
        res = supabase.auth.sign_up({
            "email": email,
            "password": password,
            "options": {
                "data": {
                    "name": name
                }
            }
        })

        if not res.user:
            raise HTTPException(status_code=400, detail="Signup failed")

        # Create user profile record (onboarding not completed yet)
        try:
            supabase.table("user_profiles").insert({
                "user_id": res.user.id,
                "email": email,
                "onboarding_completed": False,
                "created_at": datetime.utcnow().isoformat()
            }).execute()
        except Exception:
            pass

        return {
            "message": "Signup successful. Please verify your email.",
            "user": res.user,
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


async def signin_user(email: str, password: str):
    try:
        res = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password,
        })

        if not res.session:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Check if user has completed onboarding
        onboarding_completed = False
        try:
            user_profile = supabase.table("user_profiles")\
                .select("onboarding_completed")\
                .eq("user_id", res.user.id)\
                .single()\
                .execute()
            if user_profile.data:
                onboarding_completed = user_profile.data.get("onboarding_completed", False)
        except Exception:
            onboarding_completed = False

        return {
            "user": res.user,
            "access_token": res.session.access_token,
            "refresh_token": res.session.refresh_token,
            "onboarding_completed": onboarding_completed
        }

    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))
