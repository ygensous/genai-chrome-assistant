import { OpenAIService } from '../services/openai.service.js';
import { StorageService } from '../services/storage.service.js';
import { truncateContent } from '../utils/helpers.js';
import { DEFAULT_SETTINGS } from '../utils/constants.js';

class PanelController {
    constructor() {
        this.storageService = new StorageService();
        this.openAIService = null;
        this.maxLength = DEFAULT_SETTINGS.MAX_LENGTH;
        this.currentUrl = '';
        this.systemMessage = '';
        
        this.elements = {
            promptButtons: document.getElementById('prompt-buttons'),
            analyzeBtn: document.getElementById('analyze-btn'),
            analysisInput: document.getElementById('analysis-input'),
            resultsContent: document.getElementById('results-content'),
            loading: document.getElementById('loading'),
            copyButton: document.getElementById('copy-button')
        };

        this.initialize();
        this.setupTabChangeListener();
    }

    async initialize() {
        const settings = await this.storageService.getSettings();
        this.openAIService = new OpenAIService(settings.apiKey);
        this.maxLength = settings.maxLength || DEFAULT_SETTINGS.MAX_LENGTH;
        this.systemMessage = settings.systemMessage || '';
        await this.updateCurrentTab();
        await this.setupPromptButtons();

        this.elements.analyzeBtn.addEventListener('click', () => this.handleAnalyze());
        this.elements.copyButton.addEventListener('click', () => this.handleCopy());
    }

    setupTabChangeListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'tabChanged') {
                this.updateCurrentTab().then(() => this.setupPromptButtons());
            }
        });
    }

    async updateCurrentTab() {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        this.currentUrl = tabs[0]?.url || '';
        this.updateCopyButtonIcon();
    }

    updateCopyButtonIcon() {
        const isGmail = this.currentUrl.includes('mail.google.com');
        this.elements.copyButton.innerHTML = isGmail 
            ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 12h14"/>
                <path d="M13 5l7 7-7 7"/>
               </svg>`
            : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
               </svg>`;
        
        this.elements.copyButton.title = isGmail 
            ? 'Insert into Gmail compose box'
            : 'Copy to clipboard';
    }

    async handleCopy() {
        const content = this.elements.resultsContent.textContent;
        if (content) {
            try {
                const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tabs[0]?.id) {
                    await chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'pasteIntoGmail',
                        content: content
                    });
                    
                    const originalColor = this.elements.copyButton.style.color;
                    this.elements.copyButton.style.color = '#4CAF50';
                    setTimeout(() => {
                        this.elements.copyButton.style.color = originalColor;
                    }, 1000);
                }
            } catch (err) {
                console.error('Failed to paste into Gmail:', err);
            }
        }
    }

    async handleAnalyze() {
        const prompt = this.elements.analysisInput.value.trim();
        if (!prompt) {
            this.showError('Please enter an analysis request.');
            return;
        }

        this.elements.loading.classList.remove('hidden');
        this.elements.resultsContent.textContent = '';

        try {
            const content = await this.getPageContent();
            const truncatedContent = truncateContent(
                JSON.stringify(content),
                this.maxLength
            );
            const result = await this.openAIService.analyze(prompt, truncatedContent);
            this.elements.resultsContent.textContent = result;
        } catch (error) {s
            this.showError(error.message);
        } finally {
            this.elements.loading.classList.add('hidden');
        }
    }

    async getPageContent() {
        const response = await chrome.runtime.sendMessage({ action: 'analyzeContent' });
        if (response.error) {
            throw new Error(response.error);
        }
        return response.result;
    }

    showError(message) {
        this.elements.resultsContent.textContent = `Error: ${message}`;
    }

    async setupPromptButtons() {
        const prompts = await this.storageService.getCustomPrompts();
        this.elements.promptButtons.innerHTML = '';

        prompts.forEach(prompt => {
            if (this.shouldShowPrompt(prompt.urlPattern)) {
                const button = document.createElement('button');
                button.className = 'prompt-button';
                button.textContent = prompt.label;
                button.addEventListener('click', () => {
                    this.elements.analysisInput.value = prompt.prompt;
                    this.handleAnalyze();
                });
                this.elements.promptButtons.appendChild(button);
            }
        });
    }

    shouldShowPrompt(urlPattern) {
        if (!urlPattern) return true; // Empty pattern means show on all pages
        
        try {
            // Convert wildcard pattern to regex
            const regexPattern = urlPattern
                .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
                .replace(/\*/g, '.*?') // Convert * to non-greedy .*?
                .replace(/\\\.\*\?$/, '.*?'); // Make the last wildcard non-greedy if it's at the end

            // For Google Docs URLs, only match the base part
            const urlToMatch = this.currentUrl.split(/[?#]/)[0]; // Remove query params and hash
            
            const regex = new RegExp(`^${regexPattern}`);
            
            return regex.test(urlToMatch);
        } catch (error) {
            console.error('Error matching URL pattern:', error);
            return false;
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => new PanelController());