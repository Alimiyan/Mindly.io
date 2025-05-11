import asyncio

class SSEStream:
    def __init__(self):
        self._queue = asyncio.Queue()
        self._closed = False

    async def send(self, data: str):
        await self._queue.put(data)

    async def close(self):
        self._closed = True
        await self._queue.put(None)

    def __aiter__(self):
        return self

    async def __anext__(self):
        data = await self._queue.get()
        if data is None:
            raise StopAsyncIteration
        return f"data: {data}\n\n"  # Proper SSE formatting
