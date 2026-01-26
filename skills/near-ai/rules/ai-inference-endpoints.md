# AI: Inference Endpoints

Use NEAR AI inference endpoints for decentralized AI model inference.

## Why It Matters

NEAR AI inference endpoints provide:
- Decentralized AI inference infrastructure
- Access to various AI models
- Cost-effective inference
- Integration with NEAR ecosystem
- Scalable AI capabilities

## ❌ Incorrect

```python
# Don't use centralized services directly without fallbacks
import openai

def generate_response(prompt: str) -> str:
    # Locked into single provider, no NEAR integration
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content
```

**Problems:**
- Dependent on single centralized provider
- No integration with NEAR ecosystem
- No fallback options
- Potentially higher costs
- No decentralization benefits

## ✅ Correct

```python
import os
from nearai import NearAI
from typing import Optional

# Initialize NEAR AI client with environment validation
def init_nearai() -> NearAI:
    """Initialize NEAR AI client with proper error handling."""
    account_id = os.getenv("NEAR_ACCOUNT_ID")
    private_key = os.getenv("NEAR_PRIVATE_KEY")
    
    if not account_id or not private_key:
        raise ValueError(
            "Missing required environment variables: NEAR_ACCOUNT_ID and NEAR_PRIVATE_KEY. "
            "Please set these variables to authenticate with NEAR AI."
        )
    
    return NearAI(
        account_id=account_id,
        private_key=private_key,
    )

nearai = init_nearai()

def generate_response(
    prompt: str,
    model: str = "llama-3-70b",
    max_tokens: int = 1000,
    temperature: float = 0.7
) -> Optional[str]:
    """
    Generate AI response using NEAR AI inference endpoints.
    
    Args:
        prompt: The input prompt for the model
        model: Model identifier (e.g., 'llama-3-70b', 'mistral-7b')
        max_tokens: Maximum tokens to generate
        temperature: Sampling temperature (0.0 to 1.0)
    
    Returns:
        Generated response or None if failed
    """
    try:
        # Use NEAR AI inference endpoint
        response = nearai.inference.chat_completions(
            model=model,
            messages=[
                {"role": "system", "content": "You are a helpful AI assistant."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=max_tokens,
            temperature=temperature,
        )
        
        return response.choices[0].message.content
        
    except Exception as e:
        print(f"NEAR AI inference failed: {e}")
        # Implement fallback if needed
        return None

# Usage example
def process_user_query(user_input: str) -> str:
    """Process user query with AI assistance."""
    
    # Generate response using NEAR AI
    response = generate_response(
        prompt=user_input,
        model="llama-3-70b",
        max_tokens=500,
        temperature=0.7
    )
    
    if response is None:
        return "Sorry, I couldn't process your request at this time."
    
    return response

# Streaming responses
def generate_streaming_response(prompt: str):
    """Generate streaming AI response for better UX."""
    try:
        stream = nearai.inference.chat_completions(
            model="llama-3-70b",
            messages=[{"role": "user", "content": prompt}],
            stream=True,
        )
        
        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
                
    except Exception as e:
        print(f"Streaming failed: {e}")
        yield "Error generating response"
```

**Benefits:**
- Uses decentralized NEAR AI infrastructure
- Support for multiple models
- Integrated with NEAR ecosystem
- Streaming support for better UX
- Easy to implement fallbacks
- Cost tracking on NEAR

## Available Models

```python
# Common NEAR AI models
MODELS = {
    "llama-3-70b": "High quality, larger context",
    "llama-3-8b": "Faster, efficient for simple tasks",
    "mistral-7b": "Good balance of speed and quality",
    "codellama": "Optimized for code generation",
}

def choose_model(task_complexity: str) -> str:
    """Choose appropriate model based on task."""
    if task_complexity == "simple":
        return "llama-3-8b"
    elif task_complexity == "code":
        return "codellama"
    else:
        return "llama-3-70b"
```

## Function Calling Pattern

```python
def inference_with_tools(prompt: str, tools: list):
    """Use AI inference with function calling."""
    response = nearai.inference.chat_completions(
        model="llama-3-70b",
        messages=[{"role": "user", "content": prompt}],
        tools=tools,
        tool_choice="auto",
    )
    
    # Handle tool calls if present
    if response.choices[0].message.tool_calls:
        for tool_call in response.choices[0].message.tool_calls:
            function_name = tool_call.function.name
            arguments = tool_call.function.arguments
            # Execute the function and continue conversation
    
    return response.choices[0].message.content
```

## Additional Considerations

- Choose model based on task complexity and latency requirements
- Implement token counting to manage costs
- Use streaming for long responses to improve UX
- Cache responses when appropriate to reduce costs
- Monitor inference costs and performance
- Implement rate limiting for production
- Handle errors gracefully with fallbacks
- Consider using function calling for complex tasks

## References

- [NEAR AI Documentation](https://docs.near.ai/)
- [NEAR AI Python SDK](https://github.com/near/nearai)
- [Available Models](https://app.near.ai/agents)
- [Inference API](https://docs.near.ai/api/inference)
