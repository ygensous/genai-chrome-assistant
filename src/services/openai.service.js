import { APIError } from '../utils/errors.js';

export class OpenAIService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.apiUrl = 'https://api.openai.com/v1/chat/completions';
  }

  async analyze(prompt, content) {
    if (!this.apiKey) {
      throw new APIError('OpenAI API key is not set. Please set it in the extension options.');
    }

    try {
      const response = await fetch(this.apiUrl, {
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
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || 'OpenAI API request failed';
        throw new APIError(`OpenAI Error: ${errorMessage}`, response.status);
      }

      const data = await response.json();
      if (!data.choices?.[0]?.message?.content) {
        throw new APIError('Invalid response from OpenAI API');
      }

      return data.choices[0].message.content;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(`OpenAI API error: ${error.message}`);
    }
  }
}
