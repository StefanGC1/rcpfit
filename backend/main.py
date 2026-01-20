from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routers import auth, exercises, splits, templates, workouts, analytics

app = FastAPI(title="Workout Tracker API")

# CORS will be set up for Frontend -> Backend communication
# when dev deployed on Vercel + Render
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(exercises.router, prefix="/exercises", tags=["Exercises"])
app.include_router(splits.router, prefix="/splits", tags=["Splits"])
app.include_router(templates.router, prefix="/templates", tags=["Templates"])
app.include_router(workouts.router, prefix="/workouts", tags=["Workouts"])
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])


@app.get("/")
async def root():
    return {"message": "Welcome to RCPFit API", "docs": "/docs"}


@app.get("/health")
async def health_check():
    return {"status": "ok", "db_url": settings.DATABASE_URL.split("@")[-1]}
