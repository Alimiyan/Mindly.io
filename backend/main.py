from fastapi import FastAPI
from sse_starlette.sse import EventSourceResponse
from dotenv import load_dotenv
import os
import google.generativeai as genai
import asyncio
from fastapi.middleware.cors import CORSMiddleware 

load_dotenv()

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  #
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)

async def event_generator(contents: str):
    model = genai.GenerativeModel("gemini-1.5-flash")  # or "gemini-pro", etc.
    stream = model.generate_content(contents, stream=True)

    # Use a regular `for` loop, because `stream` is a sync iterable
    for chunk in stream:
        if chunk.text:  # Only send chunks with text
            yield {"data": chunk.text}
        await asyncio.sleep(0.01)  # To allow other tasks to run

@app.get("/stream-chat")
async def stream_chat(contents: str):
    return EventSourceResponse(event_generator(contents))
