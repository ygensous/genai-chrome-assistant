// Global initialization flag
if (!window.contentScriptInitialized) {
  window.contentScriptInitialized = true;

  console.log('Initializing content script...');

  const contentExtractor = new ContentExtractorService();

  // Set up message listener
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request);
    
    if (request.action === 'getContent') {
      try {
        const content = contentExtractor.extractMainContent();
        console.log('Extracted content:', content);
        sendResponse(content);
      } catch (error) {
        console.error('Error extracting content:', error);
        sendResponse({ error: error.message });
      }
      return true; // Keep the message channel open for async response
    }
  });

  console.log('Content script initialized successfully');
} 