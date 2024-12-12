// Wrap everything in a self-executing function to avoid global scope pollution
(function() {
    // Check if the script is already initialized
    if (window.smartPageAnalyzerInitialized) return;
    window.smartPageAnalyzerInitialized = true;

    const contentExtractor = new ContentExtractorService();

    function findGmailEditor() {
        // Try different possible selectors for Gmail compose box
        const possibleSelectors = [
            // Main compose window
            'div[role="textbox"][aria-label*="Message"][contenteditable="true"]',
            // Reply box
            'div[role="textbox"][aria-label*="Reply"][contenteditable="true"]',
            // Inline reply
            'div[role="textbox"][contenteditable="true"][tabindex="1"]',
            // Generic contenteditable in active compose
            'div.Am.Al.editable[contenteditable="true"]',
            // Another common Gmail editor class
            'div.editable[contenteditable="true"][role="textbox"]'
        ];

        for (const selector of possibleSelectors) {
            const editor = document.querySelector(selector);
            if (editor) {
                return editor;
            }
        }
        return null;
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'getContent') {
            try {
                const content = contentExtractor.extractMainContent();
                sendResponse(content);
            } catch (error) {
                console.error('Content extraction error:', error);
                sendResponse({ error: error.message });
            }
            return true;
        }

        if (request.action === 'pasteIntoGmail') {
            try {
                // Find the active Gmail compose box
                const activeEditor = findGmailEditor();
                if (!activeEditor) {
                    throw new Error('Please open a compose or reply window in Gmail first');
                }

                // Create and dispatch events to properly trigger Gmail's handlers
                activeEditor.focus();
                
                // Use execCommand for better compatibility
                document.execCommand('insertText', false, request.content);

                // Fallback to direct content setting if execCommand didn't work
                if (!activeEditor.textContent) {
                    activeEditor.textContent = request.content;
                    // Dispatch both input and change events
                    ['input', 'change'].forEach(eventType => {
                        const event = new Event(eventType, {
                            bubbles: true,
                            cancelable: true,
                        });
                        activeEditor.dispatchEvent(event);
                    });
                }

                sendResponse({ success: true });
            } catch (error) {
                console.error('Failed to paste into Gmail:', error);
                sendResponse({ error: error.message });
            }
            return true;
        }
    });
})();