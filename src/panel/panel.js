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
        } catch (error) {
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