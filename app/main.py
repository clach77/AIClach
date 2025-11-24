from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from app.llm_service import LLMService
import os
import os
import pyttsx3
import tempfile
from fastapi.responses import FileResponse
import uuid

app = FastAPI(title="ITT Malafarina Orientamento")

# Mount static files
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Templates
templates = Jinja2Templates(directory="app/templates")

# Initialize LLM Service
# Ensure the data file exists relative to where we run the app
llm_service = LLMService(data_path="data/school_info.txt")

class ChatRequest(BaseModel):
    message: str
    history: list = []

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    if not request.message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    response = llm_service.chat(request.message, request.history)
    return {"response": response}

class TTSRequest(BaseModel):
    text: str

@app.post("/tts")
async def tts_endpoint(request: TTSRequest):
    if not request.text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    # Use Alice voice (Italian Premium)
    VOICE_ID = "com.apple.speech.synthesis.voice.alice.premium"
    
    # Create a temporary file
    filename = f"tts_{uuid.uuid4()}.mp3"
    filepath = os.path.join("app/static", filename)
    
    # Run pyttsx3 in a separate thread/process because it might block
    def generate_audio():
        engine = pyttsx3.init()
        engine.setProperty('voice', VOICE_ID)
        # Adjust rate if needed (default is usually around 200)
        engine.setProperty('rate', 170) 
        engine.save_to_file(request.text, filepath)
        engine.runAndWait()

    import asyncio
    try:
        await asyncio.to_thread(generate_audio)
    except Exception as e:
        print(f"TTS Generation Error: {e}")
        # Fallback if Alice fails? Or just let it error.
        raise HTTPException(status_code=500, detail=str(e))
    
    # Return the URL to the file
    return {"audio_url": f"/static/{filename}"}



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
