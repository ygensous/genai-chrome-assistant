// Initialize side panel
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Listen for tab changes
chrome.tabs.onActivated.addListener(notifyPanelOfTabChange);

// Listen for URL changes in the active tab
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        notifyPanelOfTabChange();
    }
});

async function notifyPanelOfTabChange() {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentUrl = tabs[0]?.url || '';
        chrome.runtime.sendMessage({ action: 'tabChanged', url: currentUrl });
    } catch (error) {
        console.error('Error notifying panel of tab change:', error);
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'analyzeContent') {
        handleContentAnalysis()
            .then(sendResponse)
            .catch(error => sendResponse({ error: error.message }));
        return true;
    }
});

async function handleContentAnalysis() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];
    
    if (!activeTab?.id) {
        throw new Error('No active tab found');
    }

    try {
        // Check if scripts are already injected
        let isInjected = false;
        try {
            await chrome.tabs.sendMessage(activeTab.id, { action: 'ping' });
            isInjected = true;
        } catch (error) {
            // Scripts not injected yet
        }

        // Only inject if not already injected
        if (!isInjected) {
            await injectContentScripts(activeTab.id);
            // Wait a bit for scripts to initialize
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Try to get content multiple times if needed
        let retries = 3;
        let lastError;
        
        while (retries > 0) {
            try {
                const response = await chrome.tabs.sendMessage(activeTab.id, { 
                    action: 'getContent',
                    from: 'background'
                });

                if (response.error) {
                    throw new Error(response.error);
                }

                return {
                    result: {
                        text: response.text || '',
                        tables: response.tables?.map(t => ({
                            headers: t.headers,
                            rows: t.rows,
                            text: t.text
                        })) || [],
                        links: response.links || []
                    }
                };
            } catch (error) {
                lastError = error;
                retries--;
                if (retries > 0) {
                    // Wait before retrying
                    await new Promise(resolve => setTimeout(resolve, 100));
                    // Try to reinject scripts
                    await injectContentScripts(activeTab.id);
                }
            }
        }

        throw lastError || new Error('Could not connect to the page after multiple attempts');
    } catch (error) {
        console.error('Content script communication error:', error);
        throw new Error('Could not connect to the page. Please refresh and try again.');
    }
}

async function injectContentScripts(tabId) {
    try {
        await chrome.scripting.executeScript({
            target: { tabId },
            files: ['src/services/content-extractor.service.js']
        });

        await chrome.scripting.executeScript({
            target: { tabId },
            files: ['src/scripts/content.js']
        });
    } catch (error) {
        console.error('Error injecting content scripts:', error);
        throw new Error('Failed to initialize page analysis. Please refresh and try again.');
    }
}