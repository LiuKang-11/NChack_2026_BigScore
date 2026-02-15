import requests

API_KEY = "espr_U8JLkpJ5kzj8trhILhUtVtpuZErq9XGj4iiE2Ad_UdY"
BASE_URL = "https://app.backboard.io/api"
HEADERS = {"X-API-Key": API_KEY}

# 1) Create assistant
response = requests.post(
    f"{BASE_URL}/assistants",
    json={"name": "Support Bot", "system_prompt": "You are a helpful assistant."},
    headers=HEADERS,
)
assistant_id = response.json()["assistant_id"]

# 2) Create thread
response = requests.post(
    f"{BASE_URL}/assistants/{assistant_id}/threads",
    json={},
    headers=HEADERS,
)
thread_id = response.json()["thread_id"]

# 3) Send message
response = requests.post(
    f"{BASE_URL}/threads/{thread_id}/messages",
    headers=HEADERS,
    data={"content": "Hello!", "stream": "false"},
)
print(response.json().get("content"))