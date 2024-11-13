export class OpenAIService {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async analyze(prompt, content) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: `${prompt}\n\n${content}`
            }
          ]
        })
      });

      if (!response.ok) {
        throw new APIError('OpenAI API request failed', response.status);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      throw new APIError(`OpenAI API error: ${error.message}`, error.statusCode);
    }
  }
}
