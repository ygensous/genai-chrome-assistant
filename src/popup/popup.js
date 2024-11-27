import { OpenAIService } from '../services/openai.service.js';
import { StorageService } from '../services/storage.service.js';
import { truncateContent, formatTableData } from '../utils/helpers.js';
import { APIError } from '../utils/errors.js';

const storageService = new StorageService();
let openAIService;

// Initialize services
async function initialize() {
  const settings = await storageService.getSettings();
  openAIService = new OpenAIService(settings.apiKey);
}

// Loader utility functions
async function showLoader(loader, resultContainer, resultDiv, message = 'Processing...') {
  loader.style.display = 'block';
  resultContainer.classList.add('loading');
  resultDiv.innerHTML = '';
  document.querySelector('.loader-text').textContent = message;
}

async function hideLoader(loader, resultContainer) {
  loader.style.display = 'none';
  resultContainer.classList.remove('loading');
}

// Action handlers
async function handleSummarize(content, settings) {
  if (!content.text || content.text.trim().length === 0) {
    throw new Error('No text content found on this page');
  }
  
  const prompt = `
Please analyze and summarize this content in a structured format:

1. Main Points (2-3 bullet points)
2. Key Details (if any)
3. Context & Significance
4. Notable Quotes (if any)

Format the response with markdown-style headings using ### for sections.
Use bullet points for lists.
Put quotes in blockquote format using >.`;

  const aiResponse = await openAIService.analyze(
    prompt,
    truncateContent(content.text, settings.maxLength)
  );

  // Convert markdown-style response to HTML
  const formattedResponse = aiResponse
    // Convert sections
    .replace(/###\s+(.*)/g, '<h3>$1</h3><section>')
    // Close sections
    .split('<h3>')
    .join('</section><h3>')
    // Remove extra section tags
    .replace('<section></section>', '')
    // Convert bullet points
    .replace(/^\s*[-•]\s+(.+)$/gm, '<li>$1</li>')
    // Wrap lists
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    // Convert blockquotes
    .replace(/^\s*>\s+(.+)$/gm, '<blockquote>$1</blockquote>');

  return `
    <div class="summary-result">
      ${formattedResponse}
    </div>
  `;
}

async function handleLinkExtraction(content, settings) {
  if (!content.text || content.text.trim().length === 0) {
    throw new Error('No text content found on this page');
  }
  
  const aiResponse = await openAIService.analyze(
    'From the following text, identify at most 5 relevant links and provide their descriptions in JSON format as an array of objects with "text" and "href" properties:',
    JSON.stringify(content.links)
  );
  
  try {
    // Remove the ```json and ``` from the response if present
    const cleanResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
    const links = JSON.parse(cleanResponse);
    return `<ul>${links.map(link => 
      `<li><a href="${link.href}" target="_blank">${link.text}</a></li>`
    ).join('')}</ul>`;
  } catch (error) {
    throw new Error('Failed to parse AI response as JSON. Please try again.');
  }
}

async function handleTableExtraction(content) {
  if (!content.tables || content.tables.length === 0) {
    return 'No tables found on this page.';
  }
  
  const tableData = formatTableData(content.tables);
  const aiResponse = await openAIService.analyze(
    'Analyze the following table data and provide insights. Format your response as a bullet list, with each insight on a new line starting with "• ".',
    JSON.stringify(tableData)
  );
  
  // Convert the bullet points to HTML list items
  const formattedResponse = aiResponse
    .split('\n')
    .filter(line => line.trim().startsWith('•'))
    .map(line => `<li>${line.substring(1).trim()}</li>`)
    .join('');

  return `
    <div class="table-analysis">
      <strong>Table Analysis:</strong>
      <ul>
        ${formattedResponse}
      </ul>
    </div>
  `;
}

// Main action handler
async function handleAction(actionType) {
  const loader = document.querySelector('.loader');
  const resultContainer = document.querySelector('.result-container');
  const resultDiv = document.getElementById('content');

  try {
    await showLoader(loader, resultContainer, resultDiv);
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      throw new Error('No active tab found');
    }

    const content = await sendMessageWithRetry(tab, { action: 'getContent' });
    
    if (content && content.error) {
      throw new Error(content.error);
    }

    const settings = await storageService.getSettings();
    if (!settings.apiKey) {
      throw new Error('Please set your OpenAI API key in the extension options.');
    }
    
    let result;
    switch (actionType) {
      case 'summarize':
        result = await handleSummarize(content, settings);
        break;
      default:
        throw new Error('Unknown action type');
    }

    resultDiv.innerHTML = result;
  } catch (error) {
    console.error('Error in handleAction:', error);
    let errorMessage = error.message;
    
    // Add a helpful message for API key errors
    if (errorMessage.includes('API key')) {
      errorMessage += ' Click the extension icon with right mouse button and select "Options" to set your API key.';
    }
    
    resultDiv.innerHTML = `
      <div class="error-message">
        ${errorMessage}
      </div>
    `;
  } finally {
    await hideLoader(loader, resultContainer);
  }
}

// Add this function to handle button states
function setActiveButton(activeButton) {
  // Remove active class from all buttons
  document.querySelectorAll('.btn').forEach(btn => btn.classList.remove('active'));
  // Add active class to clicked button
  activeButton.classList.add('active');
}

// Initialize and add event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initialize();
  
  document.getElementById('summarize').addEventListener('click', (e) => {
    setActiveButton(e.currentTarget);
    handleAction('summarize');
  });
  
  // Other button listeners commented out for later use
  /*
  document.getElementById('extractLinks').addEventListener('click', (e) => {
    setActiveButton(e.currentTarget);
    handleAction('extractLinks');
  });
  
  document.getElementById('extractData').addEventListener('click', (e) => {
    setActiveButton(e.currentTarget);
    handleAction('extractData');
  });
  */
});

async function sendMessageWithRetry(tab, message, maxAttempts = 3) {
  // First attempt - try to send message
  try {
    return await chrome.tabs.sendMessage(tab.id, message);
  } catch (error) {
    console.log('Initial message failed, reloading tab...');
    
    // If failed, reload the tab and try again
    await chrome.tabs.reload(tab.id);
    
    // Wait for the page to load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Try one more time after reload
    try {
      return await chrome.tabs.sendMessage(tab.id, message);
    } catch (error) {
      throw new Error('Could not connect to the page. Please try again.');
    }
  }
} 