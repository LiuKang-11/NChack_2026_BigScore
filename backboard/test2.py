import asyncio
from backboard import BackboardClient

async def main():
    client = BackboardClient(
        api_key="espr_U8JLkpJ5kzj8trhILhUtVtpuZErq9XGj4iiE2Ad_UdY"
    )

    # 1️⃣ 建立 assistant
    assistant = await client.create_assistant(
        name="My First Assistant",
        description="You are an agent to score positive/negative level from 0 to 100."
    )
    print(f"Created assistant: {assistant.assistant_id}")

    # 2️⃣ 建立 thread
    thread = await client.create_thread(assistant.assistant_id)
    print(f"Created thread: {thread.thread_id}")

    # 3️⃣ 發送第一則訊息
    response = await client.add_message(
        thread_id=thread.thread_id,
        content="I really love the movie from Frence.",
        stream=False
    )
    print(f"Assistant: {response.content}")

    # 4️⃣ 第二則訊息（相同問題）
    response = await client.add_message(
        thread_id=thread.thread_id,
        content="What is the capital of this country?",
        stream=False
    )
    print(f"Assistant: {response.content}")


asyncio.run(main())
