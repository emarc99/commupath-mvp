"""
Vision Verifier Agent for CommuPath.
Uses Gemini 2.5 Pro Vision to verify quest completion through image analysis.
"""

import google.genai as genai
from google.genai import types
import os
from typing import Dict, Any
import base64
from PIL import Image
import io


class VisionVerifier:
    """
    AI agent that verifies quest completion using multimodal image analysis.
    Uses Gemini 2.5 Pro Vision for understanding images and context.
    """
    
    def __init__(self):
        """Initialize the Vision Verifier with Gemini client"""
        self.client = genai.Client()
        self.model = "gemini-2.5-pro"  # Supports vision
    
    async def verify_quest_proof(
        self,
        image_path: str,
        quest_title: str,
        quest_description: str,
        quest_category: str,
        user_description: str = ""
    ) -> Dict[str, Any]:
        """
        Verify if an image proves quest completion.
        
        Args:
            image_path: Path to the uploaded image file
            quest_title: Title of the quest
            quest_description: Full description of what needs to be done
            quest_category: Quest category (Environment, Social, etc.)
            user_description: Optional text description from user
            
        Returns:
            Dictionary with:
            - confidence_score (float): 0.0 - 1.0
            - verification_result (str): "Verified", "Rejected", or "Unclear"
            - reasoning (str): AI's explanation
            - suggested_points (int): Points to award (0-100)
        """
        try:
            # Read and encode image
            with open(image_path, "rb") as img_file:
                image_data = img_file.read()
            
            # Create verification prompt
            prompt = self._create_verification_prompt(
                quest_title=quest_title,
                quest_description=quest_description,
                quest_category=quest_category,
                user_description=user_description
            )
            
            print(f"🔍 Verifying quest proof with Gemini Vision...")
            print(f"   Quest: {quest_title}")
            print(f"   Category: {quest_category}")
            
            # Call Gemini with image
            response = self.client.models.generate_content(
                model=self.model,
                contents=[
                    types.Content(
                        role="user",
                        parts=[
                            types.Part.from_bytes(
                                data=image_data,
                                mime_type="image/jpeg"
                            ),
                            types.Part.from_text(text=prompt)
                        ]
                    )
                ],
                config=types.GenerateContentConfig(
                   temperature=0.3,  # Lower temp for consistent evaluation
                    response_mime_type="application/json",
                    response_schema={
                        "type": "object",
                        "properties": {
                            "confidence_score": {
                                "type": "number",
                                "description": "Confidence from 0.0 to 1.0 that the image proves quest completion"
                            },
                            "verification_result": {
                                "type": "string",
                                "enum": ["Verified", "Rejected", "Unclear"],
                                "description": "Overall verification decision"
                            },
                            "reasoning": {
                                "type": "string",
                                "description": "Detailed explanation of the verification decision"
                            },
                            "suggested_points": {
                                "type": "integer",
                                "description": "Points to award from 0 to 100 based on impact and completion quality"
                            },
                            "key_observations": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "List of key things observed in the image"
                            }
                        },
                        "required": ["confidence_score", "verification_result", "reasoning", "suggested_points"]
                    }
                )
            )
            
            # Parse response
            result = eval(response.text)  # JSON response
            
            print(f"✅ Verification complete:")
            print(f"   Result: {result['verification_result']}")
            print(f"   Confidence: {result['confidence_score']:.2%}")
            print(f"   Points: {result['suggested_points']}")
            
            return {
                "confidence_score": result["confidence_score"],
                "verification_result": result["verification_result"],
                "reasoning": result["reasoning"],
                "suggested_points": result["suggested_points"],
                "key_observations": result.get("key_observations", [])
            }
            
        except Exception as e:
            print(f"❌ Error in vision verification: {e}")
            
            # Fallback response
            return {
                "confidence_score": 0.0,
                "verification_result": "Unclear",
                "reasoning": f"Error during verification: {str(e)}. Please try again.",
                "suggested_points": 0,
                "key_observations": []
            }
    
    def _create_verification_prompt(
        self,
        quest_title: str,
        quest_description: str,
        quest_category: str,
        user_description: str
    ) -> str:
        """Create a detailed prompt for vision verification"""
        
        prompt = f"""You are an expert AI verifier for community impact quests. Your job is to analyze an image submission and determine if it genuinely proves the completion of a quest.

**QUEST INFORMATION:**
- Title: {quest_title}
- Description: {quest_description}
- Category: {quest_category}

**USER'S DESCRIPTION:**
{user_description if user_description else "No description provided"}

**YOUR TASK:**
Carefully examine the image and evaluate the following:

1. **Authenticity**: Does the image appear to be genuine (not AI-generated, not stock photo)?
2. **Relevance**: Does the image directly relate to the quest objective?
3. **Completion Evidence**: Does the image prove that the quest was actually completed?
4. **Impact Quality**: Based on what you see, how significant is the community impact?
5. **Safety & Appropriateness**: Is the content safe, appropriate, and aligned with positive community values?

**VERIFICATION CRITERIA:**
- ✅ **Verified** (confidence > 0.7): Clear evidence of quest completion with authentic, relevant proof
- ⚠️  **Unclear** (confidence 0.3-0.7): Some evidence but missing key elements or unclear authenticity
- ❌ **Rejected** (confidence < 0.3): No clear evidence, irrelevant image, or inappropriate content

**POINTS CALCULATION:**
- Exceptional impact with perfect evidence: 80-100 points
- Good impact with solid evidence: 50-79 points
- Moderate impact or partial evidence: 20-49 points
- Minimal/unclear evidence: 0-19 points

**IMPORTANT:**
- Be encouraging but honest in your assessment
- If unsure, provide constructive feedback on what's missing
- Consider the quest category when evaluating impact
- Reward genuine effort and authentic proof

Provide your analysis in JSON format with confidence_score, verification_result, reasoning, suggested_points, and key_observations.
"""
        
        return prompt
