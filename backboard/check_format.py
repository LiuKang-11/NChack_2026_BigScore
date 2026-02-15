# Install: pip install backboard-sdk
# CG-RHW35ayqMMmgm4yTDM8EWiin
# Hv31IStryBsbeppJ9ZvGP
import asyncio
from backboard import BackboardClient

async def main():
    # Initialize the Backboard client
    client = BackboardClient(api_key="espr_U8JLkpJ5kzj8trhILhUtVtpuZErq9XGj4iiE2Ad_UdY")
    
    # Create an assistant
    assistant = await client.create_assistant(
        name="Memory Assistant",
        discriptions="You are a helpful assistant with persistent memory"
    )
    
    # Create first thread and share information
    thread1 = await client.create_thread(assistant.assistant_id)
    
    # Share information with memory enabled
    response1 = await client.add_message(
        thread_id=thread1.thread_id,
        content="My name is Sarah and I work as a software engineer at Google.",
        memory="Auto",  # Enable memory - automatically saves relevant info
        stream=False
    )
    print(f"AI: {response1.content}")
    
    # Optional: Poll for memory operation completion
    # memory_op_id = response1.memory_operation_id
    # if memory_op_id:
    #     import time
    #     while True:
    #         status_response = requests.get(
    #             f"{base_url}/assistants/memories/operations/{memory_op_id}",
    #             headers={"X-API-Key": api_key}
    #         )
    #         if status_response.status_code == 200:
    #             data = status_response.json()
    #             if data.get("status") in ("COMPLETED", "ERROR"):
    #                 print(f"Memory operation: {data.get('status')}")
    #                 break
    #         time.sleep(1)
    
    # Create a new thread to test memory recall
    thread2 = await client.create_thread(assistant.assistant_id)
    
    # Ask what the assistant remembers (in a completely new thread!)
    response3 = await client.add_message(
        thread_id=thread2.thread_id,
        content="What do you remember about me?",
        memory="Auto",  # Searches and retrieves saved memories
        stream=False
    )
    print(f"AI: {response3.content}")
    # Should mention: Sarah, Google, software engineer

if __name__ == "__main__":
    asyncio.run(main())
