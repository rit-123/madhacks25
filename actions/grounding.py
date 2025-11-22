# grounding.py - Add this to your project

import requests
import base64
import re
import pyautogui
import io
import os

class GroundingModel:
    def __init__(self, endpoint_url, hf_token):
        self.endpoint_url = endpoint_url
        self.hf_token = hf_token
    
    def find_coordinates(self, element_description: str) -> tuple[int, int]:
        """
        Find coordinates of a UI element from description.
        
        Args:
            element_description: Natural language description of what to find
            
        Returns:
            (x, y) coordinates
        """
        # Take screenshot
        screenshot = pyautogui.screenshot()
        buffered = io.BytesIO()
        screenshot.save(buffered, format="PNG")
        screenshot_bytes = buffered.getvalue()
        screenshot_b64 = base64.b64encode(screenshot_bytes).decode('utf-8')
        
        # Prepare prompt
        prompt = f"Query:{element_description}\nOutput only the coordinate of one point in your response.\n"
        
        # Call grounding model
        headers = {
            "Authorization": f"Bearer {self.hf_token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "ByteDance-Seed/UI-TARS-1.5-7B",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{screenshot_b64}"
                            }
                        }
                    ]
                }
            ],
            "max_tokens": 100,
            "temperature": 0.0
        }
        
        response = requests.post(
            f"{self.endpoint_url}/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            text = result['choices'][0]['message']['content']
            
            # Parse coordinates
            numericals = re.findall(r"\d+", text)
            if len(numericals) >= 2:
                return int(numericals[0]), int(numericals[1])
        
        raise Exception(f"Failed to find coordinates for: {element_description}")


# Now integrate with your actions:
from actions import ComputerActions

class SmartActions(ComputerActions):
    """
    Actions + Grounding = Smart Actions that can find UI elements
    """
    
    def __init__(self, grounding_model: GroundingModel = None):
        super().__init__()
        self.grounding = grounding_model
    
    def click_element(self, description: str, button: str = 'left', clicks: int = 1) -> Dict:
        """
        Click on a UI element by description.
        
        Args:
            description: What to click (e.g., "the send button")
            
        Example:
            click_element("the LinkedIn message input box")
        """
        print(f"🔍 Finding: {description}")
        x, y = self.grounding.find_coordinates(description)
        print(f"✅ Found at: ({x}, {y})")
        
        return self.click(x, y, button=button, clicks=clicks)
    
    def type_in_element(self, description: str, text: str) -> Dict:
        """
        Click an element and type text into it.
        
        Args:
            description: What to click (e.g., "the search box")
            text: What to type
            
        Example:
            type_in_element("the message input box", "Hello world!")
        """
        # Click to focus
        self.click_element(description)
        self.wait(0.3)
        
        # Type text
        return self.type_text(text)