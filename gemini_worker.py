import asyncio
import sys
import os
from dotenv import load_dotenv

try:
    from gemini_webapi import GeminiClient
except ImportError:
    
    print("Error: gemini_webapi library not found. Please pip install it.")
    sys.exit(1)

# Load environment variables from .env file
load_dotenv()

# Read cookies from environment variables
Secure_1PSID = os.environ.get("SECURE_1PSID", "")
Secure_1PSIDTS = os.environ.get("SECURE_1PSIDTS", "")

INPUT_FILE = "input.txt"
OUTPUT_FILE = "response.txt"

SYSTEM_PROMPT = (
    "You are a professional editor. Correct the grammar, spelling, and punctuation "
    "of the following text. Strictly only correct errors, but keep the original tone. "
    "IMPORTANT: Output ONLY the corrected text. Do not add conversational filler."
    "\n\nInput Text:\n"
)

async def main():
    if not os.path.exists(INPUT_FILE):
        print(f"Error: {INPUT_FILE} not found.")
        return

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        user_text = f.read().strip()

    if not user_text:
        print("Error: Input text is empty.")
        return
    print("Initializing Gemini client...")
    
    try:
        client = GeminiClient(Secure_1PSID, Secure_1PSIDTS)
        await client.init(timeout=30, auto_close=True)
        print("Sending text to Gemini...")
        full_prompt = SYSTEM_PROMPT + user_text
        response = await client.generate_content(
            full_prompt,
            model="gemini-3.0-flash"
        )
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            f.write(response.text)
        print("Success!")

    except Exception as e:
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            f.write("ERROR: " + str(e))
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    asyncio.run(main())