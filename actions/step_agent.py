"""
step_agent.py - One action at a time, based on current state

Each prompt to Claude includes:
- The goal
- Last action taken
- Current screenshot

Claude returns ONE next action (or "done")
"""

import json
import base64
import io
from typing import Dict, Any, Optional
from anthropic import Anthropic
import pyautogui
from actions import ComputerActions, get_action_descriptions
from grounding import GroundingModel, SmartActions


class StepAgent:
    """
    Agent that decides one action at a time based on current screen state.
    """
    
    def __init__(
        self,
        anthropic_api_key: str,
        grounding_model: Optional[GroundingModel] = None
    ):
        self.client = Anthropic(api_key=anthropic_api_key)
        self.grounding = grounding_model
        self.actions = SmartActions(grounding_model) if grounding_model else ComputerActions()
        self.action_descriptions = get_action_descriptions()
        
        # Add grounding actions if available
        if grounding_model:
            self.action_descriptions.update({
                "click_element": {
                    "description": "Click on a UI element by description (uses AI vision)",
                    "params": {"description": "string"},
                    "example": "click_element('the search button')"
                },
                "type_in_element": {
                    "description": "Click an element and type text (uses AI vision)",
                    "params": {"description": "string", "text": "string"},
                    "example": "type_in_element('the search box', 'hello')"
                }
            })
        
        self.history = []  # List of executed actions
    
    def _screenshot_to_base64(self) -> str:
        """Take screenshot and encode as base64, compressed to stay under 5MB."""
        from PIL import Image
        
        screenshot = pyautogui.screenshot()
        
        # Convert RGBA to RGB (JPEG doesn't support transparency)
        if screenshot.mode == 'RGBA':
            rgb_screenshot = Image.new('RGB', screenshot.size, (255, 255, 255))
            rgb_screenshot.paste(screenshot, mask=screenshot.split()[3])
            screenshot = rgb_screenshot
        
        # Resize if too large (keep aspect ratio)
        max_dimension = 1920
        if screenshot.width > max_dimension or screenshot.height > max_dimension:
            screenshot.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
        
        # Save as JPEG with compression
        quality = 85
        buffered = io.BytesIO()
        screenshot.save(buffered, format="JPEG", quality=quality, optimize=True)
        
        # Check size and reduce quality if needed
        while buffered.tell() > 4.5 * 1024 * 1024:  # 4.5MB to be safe
            quality = max(60, quality - 10)
            buffered = io.BytesIO()
            screenshot.save(buffered, format="JPEG", quality=quality, optimize=True)
        
        return base64.b64encode(buffered.getvalue()).decode('utf-8')
    
    def _build_system_prompt(self) -> str:
        """Build the system prompt with available actions."""
        actions_json = json.dumps(self.action_descriptions, indent=2)
        
        return f"""You are a computer automation agent that decides ONE action at a time.

AVAILABLE ACTIONS:
{actions_json}

YOUR JOB:
1. Look at the current screenshot
2. Consider the goal and what's been done so far
3. Decide the NEXT SINGLE ACTION to take
4. Output ONLY that action in JSON format

OUTPUT FORMAT:
If you need to take another action:
{{
  "action": "action_name",
  "params": {{"param1": "value1"}},
  "reasoning": "why this action"
}}

If the goal is complete:
{{
  "action": "done",
  "params": {{}},
  "reasoning": "goal accomplished"
}}

RULES:
- Output ONLY valid JSON, nothing else
- ONE action per response
- Use click_element() and type_in_element() when you need to find UI elements
- Use wait() after actions that change the UI (1-3 seconds)
- Be specific in element descriptions
- Output "done" when goal is accomplished

CRITICAL: Your entire response must be a single JSON object. No text before or after."""

    def next_action(self, goal: str) -> Dict[str, Any]:
        """
        Decide the next action to take.
        
        Args:
            goal: The overall goal to accomplish
            
        Returns:
            Action dictionary with 'action', 'params', 'reasoning'
        """
        # Build context about what's been done
        if self.history:
            last_action = self.history[-1]
            context = f"Last action: {last_action['action']}({last_action['params']}) - {last_action['status']}"
            
            if len(self.history) > 1:
                context += f"\n\nAll previous actions:\n"
                for i, h in enumerate(self.history, 1):
                    context += f"{i}. {h['action']}({h['params']}) - {h['status']}\n"
        else:
            context = "No actions taken yet. This is the first action."
        
        # Take screenshot
        screenshot_b64 = self._screenshot_to_base64()
        
        # Build prompt
        user_message = f"""Goal: {goal}

{context}

Based on the current screenshot, what is the NEXT action to take?"""
        
        # Call Claude
        print("🤔 Asking Claude for next action...")
        response = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=500,
            system=self._build_system_prompt(),
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": user_message},
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",
                                "data": screenshot_b64
                            }
                        }
                    ]
                }
            ]
        )
        
        # Parse response
        response_text = response.content[0].text.strip()
        
        # Try to extract JSON from response
        # Look for { ... } pattern
        import re
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        
        if json_match:
            response_text = json_match.group(0)
        else:
            # Try cleaning up markdown
            if response_text.startswith("```"):
                lines = response_text.split("\n")
                response_text = "\n".join(lines[1:-1])
                if response_text.startswith("json"):
                    response_text = response_text[4:].strip()
        
        try:
            action_dict = json.loads(response_text)
            return action_dict
        except json.JSONDecodeError as e:
            print(f"❌ Failed to parse: {e}")
            print(f"Response: {response_text}")
            raise
    
    def execute_action(self, action_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a single action.
        
        Args:
            action_dict: Action from next_action()
            
        Returns:
            Execution result
        """
        action_name = action_dict['action']
        params = action_dict.get('params', {})
        reasoning = action_dict.get('reasoning', '')
        
        print(f"\n⚡ Action: {action_name}")
        print(f"   Params: {params}")
        print(f"   Why: {reasoning}")
        
        if action_name == "done":
            return {
                "action": "done",
                "status": "complete",
                "params": params,
                "reasoning": reasoning
            }
        
        try:
            # Get the action method
            if not hasattr(self.actions, action_name):
                raise ValueError(f"Unknown action: {action_name}")
            
            action_method = getattr(self.actions, action_name)
            
            # Execute
            result = action_method(**params)
            
            print(f"   ✅ Success")
            
            return {
                "action": action_name,
                "params": params,
                "reasoning": reasoning,
                "result": result,
                "status": "success"
            }
            
        except Exception as e:
            print(f"   ❌ Failed: {e}")
            return {
                "action": action_name,
                "params": params,
                "reasoning": reasoning,
                "error": str(e),
                "status": "failed"
            }
    
    def run(self, goal: str, max_steps: int = 20) -> list:
        """
        Run the agent step-by-step until done.
        
        Args:
            goal: Goal to accomplish
            max_steps: Maximum number of steps before stopping
            
        Returns:
            List of all actions taken
        """
        print("=" * 60)
        print(f"🎯 GOAL: {goal}")
        print("=" * 60)
        
        self.history = []
        
        for step in range(1, max_steps + 1):
            print(f"\n{'='*60}")
            print(f"STEP {step}/{max_steps}")
            print(f"{'='*60}")
            
            # Try to get next action with retries
            max_retries = 3
            action_dict = None
            
            for attempt in range(1, max_retries + 1):
                try:
                    action_dict = self.next_action(goal)
                    break
                except Exception as e:
                    print(f"❌ Attempt {attempt}/{max_retries} failed: {e}")
                    if attempt < max_retries:
                        print("   Retrying...")
                        import time
                        time.sleep(1)
                    else:
                        print("   Max retries reached, skipping this step")
                        # Add a wait action as fallback
                        action_dict = {
                            "action": "wait",
                            "params": {"seconds": 1.0},
                            "reasoning": "Failed to get action from Claude, waiting"
                        }
            
            if action_dict is None:
                print("⚠️  Could not get action, stopping")
                break
            
            # Execute it
            result = self.execute_action(action_dict)
            self.history.append(result)
            
            # Check if done
            if result['action'] == 'done':
                print("\n" + "=" * 60)
                print("✅ GOAL COMPLETE!")
                print("=" * 60)
                break
            
            # Check if we should continue
            if result['status'] == 'failed':
                print(f"   ⚠️  Action failed, but continuing...")
        
        if step >= max_steps:
            print("\n" + "=" * 60)
            print("⚠️  Reached max steps")
            print("=" * 60)
        
        # Summary
        print(f"\n📊 SUMMARY:")
        print(f"   Total steps: {len(self.history)}")
        successes = sum(1 for h in self.history if h['status'] == 'success')
        print(f"   Successful: {successes}/{len(self.history)}")
        
        return self.history


if __name__ == "__main__":
    import os
    
    # Get API keys
    anthropic_key = os.environ.get('ANTHROPIC_API_KEY')
    hf_token = os.environ.get('HF_TOKEN')
    
    if not anthropic_key:
        print("Error: Set ANTHROPIC_API_KEY environment variable")
        exit(1)
    
    # Decide if we want grounding
    use_grounding = input("Use grounding model? (y/n): ").strip().lower() == 'y'
    
    grounding = None
    if use_grounding:
        if not hf_token:
            print("Error: Set HF_TOKEN environment variable")
            exit(1)
        
        print("\n🔧 Setting up grounding model...")
        grounding = GroundingModel(
            endpoint_url="https://k0mkv3j05m8vnmea.us-east-1.aws.endpoints.huggingface.cloud",
            hf_token=hf_token
        )
    
    # Create agent
    agent = StepAgent(
        anthropic_api_key=anthropic_key,
        grounding_model=grounding
    )
    
    # Get goal
    print("\n" + "=" * 60)
    print("STEP-BY-STEP AUTOMATION AGENT")
    print("=" * 60)
    
    goal = input("\n🎯 What would you like to do? ").strip()
    
    if goal:
        history = agent.run(goal, max_steps=15)
        
        print("\n" + "=" * 60)
        print("📋 ACTION HISTORY:")
        print("=" * 60)
        for i, h in enumerate(history, 1):
            status_icon = "✅" if h['status'] == 'success' else "❌"
            print(f"{i}. {status_icon} {h['action']}({h['params']})")