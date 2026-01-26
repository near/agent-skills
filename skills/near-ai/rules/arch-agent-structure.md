# Architecture: Agent Structure

Design modular agent architecture following NEAR AI best practices.

## Why It Matters

Well-structured agents are:
- Easier to maintain and update
- More reliable and testable
- Composable with other agents
- Discoverable in NEAR AI registry
- Secure and auditable

## ❌ Incorrect

```python
# Monolithic agent without clear structure
def ai_agent(user_input):
    # Everything in one function
    if "weather" in user_input:
        # Weather logic mixed in
        return get_weather()
    elif "price" in user_input:
        # Price logic mixed in
        return get_crypto_price()
    # No metadata, no versioning, not discoverable
```

**Problems:**
- Monolithic, hard to maintain
- No clear capabilities definition
- Not discoverable or composable
- No metadata or versioning
- Difficult to test

## ✅ Correct

```python
from nearai import Agent, AgentMetadata, Tool
from typing import List, Dict, Any
import json

class WeatherAgent(Agent):
    """
    Weather information agent that provides current weather data
    and forecasts for any location.
    """
    
    def __init__(self):
        # Define agent metadata
        self.metadata = AgentMetadata(
            name="weather-assistant",
            version="1.0.0",
            description="Provides weather information and forecasts",
            author="your-account.near",
            tags=["weather", "utility", "data"],
            license="MIT",
            capabilities=[
                "get_current_weather",
                "get_forecast",
                "get_weather_alerts"
            ]
        )
        
        # Initialize tools
        self.tools = self._setup_tools()
        
        # Agent state
        self.last_location = None
        
    def _setup_tools(self) -> List[Tool]:
        """Define agent tools/capabilities."""
        return [
            Tool(
                name="get_current_weather",
                description="Get current weather for a location",
                parameters={
                    "type": "object",
                    "properties": {
                        "location": {
                            "type": "string",
                            "description": "City name or coordinates"
                        },
                        "units": {
                            "type": "string",
                            "enum": ["celsius", "fahrenheit"],
                            "default": "celsius"
                        }
                    },
                    "required": ["location"]
                },
                function=self.get_current_weather
            ),
            Tool(
                name="get_forecast",
                description="Get weather forecast for next N days",
                parameters={
                    "type": "object",
                    "properties": {
                        "location": {"type": "string"},
                        "days": {"type": "integer", "minimum": 1, "maximum": 7}
                    },
                    "required": ["location", "days"]
                },
                function=self.get_forecast
            )
        ]
    
    def get_current_weather(self, location: str, units: str = "celsius") -> Dict[str, Any]:
        """Get current weather data."""
        try:
            # Implementation
            weather_data = self._fetch_weather_api(location, units)
            self.last_location = location
            
            return {
                "status": "success",
                "location": location,
                "temperature": weather_data.get("temp"),
                "conditions": weather_data.get("conditions"),
                "units": units
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Failed to get weather: {str(e)}"
            }
    
    def get_forecast(self, location: str, days: int) -> Dict[str, Any]:
        """Get weather forecast."""
        try:
            forecast_data = self._fetch_forecast_api(location, days)
            
            return {
                "status": "success",
                "location": location,
                "forecast": forecast_data,
                "days": days
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Failed to get forecast: {str(e)}"
            }
    
    async def run(self, user_input: str) -> str:
        """
        Main agent execution method.
        
        Args:
            user_input: User's natural language request
            
        Returns:
            Agent's response
        """
        # Parse user intent using AI
        intent = await self._parse_intent(user_input)
        
        # Execute appropriate tool
        if intent["tool"] == "get_current_weather":
            result = self.get_current_weather(**intent["parameters"])
        elif intent["tool"] == "get_forecast":
            result = self.get_forecast(**intent["parameters"])
        else:
            return "I can help with current weather and forecasts. What would you like to know?"
        
        # Format response
        return self._format_response(result)
    
    async def _parse_intent(self, user_input: str) -> Dict[str, Any]:
        """Parse user intent using AI."""
        # Use NEAR AI to understand user intent
        from nearai import NearAI
        
        nearai = NearAI()
        tools_description = json.dumps([t.to_dict() for t in self.tools])
        
        prompt = f"""
        Given these available tools: {tools_description}
        
        Parse this user request: "{user_input}"
        
        Return JSON with: {{"tool": "tool_name", "parameters": {{...}}}}
        """
        
        response = await nearai.inference.chat_completions(
            model="llama-3-8b",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        
        return json.loads(response.choices[0].message.content)
    
    def _format_response(self, result: Dict[str, Any]) -> str:
        """Format tool result into natural language."""
        if result["status"] == "error":
            return f"Sorry, {result['message']}"
        
        if "temperature" in result:
            return f"The current weather in {result['location']} is {result['temperature']}°{result['units'][0].upper()} with {result['conditions']}."
        
        # Format forecast
        return "Here's the forecast: " + str(result["forecast"])
    
    def get_metadata(self) -> AgentMetadata:
        """Return agent metadata for registry."""
        return self.metadata

# Register agent with NEAR AI
agent = WeatherAgent()
agent.register()  # Registers in NEAR AI Hub
```

**Benefits:**
- Clear, modular structure
- Well-defined capabilities (tools)
- Discoverable via metadata
- Versioned and documented
- Easy to test each component
- Composable with other agents
- Registered in NEAR AI Hub

## Agent Composition

```python
class CompositeAgent(Agent):
    """Agent that composes multiple sub-agents."""
    
    def __init__(self):
        self.weather_agent = WeatherAgent()
        self.price_agent = CryptoPriceAgent()
        
        self.metadata = AgentMetadata(
            name="super-assistant",
            version="1.0.0",
            description="Multi-purpose assistant",
            capabilities=["weather", "crypto_prices", "general_chat"]
        )
    
    async def run(self, user_input: str) -> str:
        # Route to appropriate sub-agent
        if "weather" in user_input.lower():
            return await self.weather_agent.run(user_input)
        elif "price" in user_input.lower():
            return await self.price_agent.run(user_input)
        else:
            return await self._handle_general_chat(user_input)
```

## Additional Considerations

- Define clear metadata for discoverability
- Implement versioning for updates
- Create modular, testable components
- Use tools/capabilities pattern
- Document each capability
- Handle errors gracefully
- Implement logging for debugging
- Register agents in NEAR AI Hub
- Consider agent composition for complex tasks
- Separate concerns (data, logic, presentation)

## References

- [NEAR AI Agent Structure](https://docs.near.ai/agents/structure)
- [Agent Registry](https://app.near.ai/agents)
- [Agent Best Practices](https://docs.near.ai/agents/best-practices)
