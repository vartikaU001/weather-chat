const WEATHER_AGENT_STREAM_URL = 'https://millions-screeching-vultur.mastra.cloud/api/agents/weatherAgent/stream';

export async function sendMessageStream(messages, options, onChunk) {
  const { threadId, signal } = options || {};
  const lastMessage = messages[messages.length - 1]?.content || '';
  
  try {
    const body = {
      messages,
      runId: 'weatherAgent',
      maxRetries: 2,
      maxSteps: 5,
      temperature: 0.5,
      topP: 1,
      runtimeContext: {},
      threadId: 2,
      resourceId: 'weatherAgent',
    };

    const response = await fetch(WEATHER_AGENT_STREAM_URL, {
      method: 'POST',
      headers: {
        'x-mastra-dev-playground': 'true',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal,
    });

    if (response.ok) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let done = false;
      
      while (!done) {
        const result = await reader.read();
        done = result.done;
        
        if (result.value) {
          buffer += decoder.decode(result.value, { stream: !done });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.trim()) {
              const colonIndex = line.indexOf(':');
              if (colonIndex > 0) {
                const prefix = line.substring(0, colonIndex);
                const jsonPart = line.substring(colonIndex + 1);
                
                if (jsonPart.startsWith('"') && jsonPart.endsWith('"')) {
                  try {
                    const stringData = JSON.parse(jsonPart);
                    console.log('String chunk:', stringData);
                    onChunk(stringData);
                    continue;
                  } catch (e) {
                    console.log('Failed to parse string chunk:', jsonPart);
                    onChunk(jsonPart);
                    continue;
                  }
                }
                
                if (!jsonPart.startsWith('{') && !jsonPart.startsWith('[')) {
                  onChunk(jsonPart);
                  continue;
                }
                
                try {
                  const data = JSON.parse(jsonPart);
                  
                  if (typeof data !== 'string' && (data.toolCallId || data.messageId)) {
                    console.log('Parsed data:', data);
                  }
                  
                  if (data.toolCallId && data.toolName === 'weatherTool' && data.args && data.args.location) {
                    const location = data.args.location;
                    onChunk(`🌤️ Getting weather information for ${location}...\n\n`);
                  } else if (data.messageId) {
                    if (data.content) {
                      onChunk(data.content + '\n');
                    } else if (data.text) {
                      onChunk(data.text + '\n');
                    } else if (data.message) {
                      onChunk(data.message + '\n');
                    }
                    continue;
                  } else if (typeof data === 'string') {
                    onChunk(data);
                  } else if (data.content || data.text) {
                    onChunk((data.content || data.text) + '\n');
                  } else if (data.delta && data.delta.content) {
                    onChunk(data.delta.content);
                  } else if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
                    onChunk(data.choices[0].delta.content);
                  } else if (data.message && data.message.content) {
                    onChunk(data.message.content + '\n');
                  } else if (data.response) {
                    onChunk(data.response + '\n');
                  } else if (data.text) {
                    onChunk(data.text + '\n');
                  } else {
                    const stringFields = ['content', 'text', 'message', 'response', 'data', 'body'];
                    let foundContent = false;
                    
                    for (const field of stringFields) {
                      if (data[field] && typeof data[field] === 'string') {
                        onChunk(data[field] + '\n');
                        foundContent = true;
                        break;
                      }
                    }
                    
                    if (!foundContent) {
                      continue;
                    }
                  }
                } catch (e) {
                  if (jsonPart.trim()) {
                    onChunk(jsonPart.trim() + '\n');
                  }
                }
              } else {
                if (line.trim()) {
                  onChunk(line.trim() + '\n');
                }
              }
            }
          }
        }
      }
      
      if (buffer.trim()) {
        const colonIndex = buffer.indexOf(':');
        if (colonIndex > 0) {
          const jsonPart = buffer.substring(colonIndex + 1);
          try {
            const data = JSON.parse(jsonPart);
            if (data.toolCallId && data.toolName === 'weatherTool' && data.args && data.args.location) {
              const location = data.args.location;
              onChunk(`🌤️ Fetching weather data for ${location}...\n\n`);
            } else if (data.content || data.text) {
              onChunk((data.content || data.text) + '\n');
            }
          } catch (e) {
            if (jsonPart.trim()) {
              onChunk(jsonPart.trim() + '\n');
            }
          }
        } else if (buffer.trim()) {
          onChunk(buffer.trim() + '\n');
        }
      }
      return;
    }
  } catch (error) {
    console.warn('Weather agent API failed, using fallback:', error);
  }

  console.log('Using fallback weather response');
  const weatherResponse = await simulateWeatherResponse(lastMessage);
  onChunk(weatherResponse);
}

async function simulateWeatherResponse(message) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('weather') || lowerMessage.includes('temperature') || lowerMessage.includes('forecast')) {
    let city = 'Mumbai';
    const cityKeywords = {
      'mumbai': 'Mumbai',
      'delhi': 'Delhi', 
      'bangalore': 'Bangalore',
      'chennai': 'Chennai',
      'kolkata': 'Kolkata',
      'hyderabad': 'Hyderabad',
      'pune': 'Pune',
      'ahmedabad': 'Ahmedabad',
      'new york': 'New York',
      'london': 'London',
      'tokyo': 'Tokyo',
      'paris': 'Paris',
      'sydney': 'Sydney',
      'dubai': 'Dubai',
      'singapore': 'Singapore'
    };
    
    for (const [keyword, cityName] of Object.entries(cityKeywords)) {
      if (lowerMessage.includes(keyword)) {
        city = cityName;
        break;
      }
    }
    
    const temp = Math.floor(Math.random() * 30) + 10;
    const humidity = Math.floor(Math.random() * 40) + 40;
    const windSpeed = Math.floor(Math.random() * 15) + 5;
    const conditions = ['sunny', 'cloudy', 'rainy', 'partly cloudy', 'clear'];
    const condition = conditions[Math.floor(Math.random() * conditions.length)];
    
    return `🌤️ Current Weather for ${city}:\n\n🌡️ Temperature: ${temp}°C\n💧 Humidity: ${humidity}%\n💨 Wind Speed: ${windSpeed} km/h\n☁️ Conditions: ${condition}\n\n📊 3-Day Forecast:\n• Today: ${condition}, ${temp}°C\n• Tomorrow: Partly cloudy, ${temp + 2}°C\n• Day after: Sunny, ${temp - 1}°C\n\nNote: This is simulated weather data. The weather agent API is currently processing your request.`;
  }
  
  return `🤖 I'm your weather assistant! I can help you with:\n\n• Current weather conditions\n• Weather forecasts\n• Temperature and humidity\n• Wind speed and direction\n• Climate information\n\nJust ask me about the weather in any city!`;
}

export async function sendMessageToAPI(message, threadId = 2) {
  let full = '';
  await sendMessageStream([{ role: 'user', content: message }], { threadId }, (chunk) => {
    full += chunk;
  });
  return full || 'No response from agent';
}
