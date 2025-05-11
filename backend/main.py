from fastapi import FastAPI, Query, HTTPException, Request
from sse_starlette.sse import EventSourceResponse
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
import asyncio
import os
import logging
import uuid

# ------------------ Config -------------------
load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
temperature = float(os.getenv("GEMINI_TEMPERATURE", "0.7"))

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory conversation history per session
conversation_memory = {}

# Mental health system prompt
SYSTEM_PROMPT = (
    "You are an AI Mental Health Companion named Mindly. "
    "You provide supportive, empathetic, and helpful responses related to mental health. "
    "You don't give medical advice or cover other topics. Stay professional, caring, and focused only on mental wellness."
)


# ------------------ Generator -------------------
async def event_generator(session_id: str, contents: str, request: Request):
    model = genai.GenerativeModel(
        model_name, generation_config={"temperature": temperature}
    )

    # Get previous messages for the session
    memory = conversation_memory.get(session_id, [])

    # Build the full prompt
    full_prompt = SYSTEM_PROMPT + "\n\n"
    for turn in memory:
        full_prompt += f"🧠 You: {turn['user']}\n🤖 Assistant: {turn['bot']}\n"
    full_prompt += f"🧠 You: {contents}\n🤖 Assistant: "

    stream = model.generate_content(full_prompt, stream=True)

    reply_text = ""

    for chunk in stream:
        if await request.is_disconnected():
            logger.info(f"Client {session_id} disconnected.")
            break
        if chunk.text:
            reply_text += chunk.text
            yield {"data": chunk.text}
        await asyncio.sleep(0.01)

    # Save the new turn
    memory.append({"user": contents, "bot": reply_text})
    conversation_memory[session_id] = memory[-10:]  # Limit to last 10 turns


# ------------------ Routes -------------------
@app.get("/stream-chat")
async def stream_chat(
    contents: str = Query(..., min_length=1),
    session_id: str = Query(...),  # Frontend should generate or persist this
    request: Request = None
):
    try:
        return EventSourceResponse(event_generator(session_id, contents, request))
    except Exception as e:
        logger.error(f"Streaming error for session {session_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Streaming error")


@app.get("/health")
async def health_check():
    return {"status": "ok"}
