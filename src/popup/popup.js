import { OpenAIService } from '../services/openai.service.js';
import { StorageService } from '../services/storage.service.js';
import { truncateContent, formatTableData } from '../utils/helpers.js';
import { APIError, ContentExtractionError } from '../utils/errors.js';

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
  return await openAIService.analyze(
    'Summarize this text in 3 sentences:',
    truncateContent(content.text, settings.maxLength)
  );
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

// Add this utility function at the top with other utility functions
async function ensureContentScriptsInjected(tabId) {
  return chrome.scripting.executeScript({
    target: { tabId },
    func: () => window.contentScriptInitialized === true,
  }).then(async (result) => {
    // If scripts aren't initialized, inject them
    if (!result[0]?.result) {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: [
          '/src/services/content-extractor.service.js',
          '/src/scripts/content.js'
        ]
      });
    }
  });
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

    // Extract content from the page
    await ensureContentScriptsInjected(tab.id);
    const content = await chrome.tabs.sendMessage(tab.id, { action: 'getContent' });
    
    if (chrome.runtime.lastError) {
      throw new Error(chrome.runtime.lastError.message);
    }
    
    if (content && content.error) {
      throw new Error(content.error);
    }

    // Load settings
    const settings = await storageService.getSettings();
    
    // Handle the actions
    let result;
    switch (actionType) {
      case 'summarize':
        result = await handleSummarize(content, settings);
        break;
      case 'extractLinks':
        result = await handleLinkExtraction(content, settings);
        break;
      case 'extractData':
        result = await handleTableExtraction(content);
        break;
      default:
        throw new Error('Unknown action type');
    }

    resultDiv.innerHTML = result;
  } catch (error) {
    console.error('Error in handleAction:', error);
    resultDiv.innerHTML = `
      <div class="error-message">
        ${error.message}
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
  
  document.getElementById('extractLinks').addEventListener('click', (e) => {
    setActiveButton(e.currentTarget);
    handleAction('extractLinks');
  });
  
  document.getElementById('extractData').addEventListener('click', (e) => {
    setActiveButton(e.currentTarget);
    handleAction('extractData');
  });
}); 