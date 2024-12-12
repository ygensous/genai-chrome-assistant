import { StorageService } from '../services/storage.service.js';

class OptionsController {
  constructor() {
    this.storageService = new StorageService();
    this.maxPrompts = 10;
    this.initialize();
  }

  async initialize() {
    // Load saved settings
    const settings = await this.storageService.getSettings();
    
    // Set API settings
    if (settings.apiKey) document.getElementById('apiKey').value = settings.apiKey;
    if (settings.model) document.getElementById('model').value = settings.model;
    if (settings.maxLength) document.getElementById('maxLength').value = settings.maxLength;

    // Set up prompts
    this.setupPrompts(settings.customPrompts || []);

    // Add event listeners
    document.getElementById('save').addEventListener('click', () => this.saveSettings());
    document.getElementById('add-prompt').addEventListener('click', () => this.addPrompt());
    document.getElementById('reset-prompts').addEventListener('click', () => this.resetPrompts());
  }

  setupPrompts(prompts) {
    const container = document.getElementById('prompts-container');
    container.innerHTML = '';
    prompts.forEach(prompt => this.addPrompt(prompt));
  }

  addPrompt(promptData = null) {
    const container = document.getElementById('prompts-container');
    const prompts = container.querySelectorAll('.prompt-item');

    if (prompts.length >= this.maxPrompts) {
      this.showStatus('Maximum number of prompts reached', 'error');
      return;
    }

    const template = document.getElementById('prompt-template');
    const promptElement = template.content.cloneNode(true);
    const promptItem = promptElement.querySelector('.prompt-item');

    // Set values if provided
    if (promptData) {
      promptItem.querySelector('.prompt-label').value = promptData.label;
      promptItem.querySelector('.prompt-text').value = promptData.prompt;
      promptItem.querySelector('.prompt-url').value = promptData.urlPattern;
    }

    // Add remove handler
    promptItem.querySelector('.remove-prompt').addEventListener('click', () => {
      promptItem.remove();
    });

    container.appendChild(promptItem);
  }

  async resetPrompts() {
    if (confirm('Are you sure you want to reset all prompts to default? This will remove all custom prompts.')) {
      const defaultPrompts = this.storageService.defaultPrompts;
      this.setupPrompts(defaultPrompts);
      await this.saveSettings();
      this.showStatus('Prompts reset to default', 'success');
    }
  }

  async saveSettings() {
    try {
      const settings = {
        apiKey: document.getElementById('apiKey').value,
        model: document.getElementById('model').value,
        maxLength: parseInt(document.getElementById('maxLength').value, 10),
        customPrompts: this.getPrompts()
      };

      await this.storageService.saveSettings(settings);
      this.showStatus('Settings saved successfully!', 'success');
    } catch (error) {
      this.showStatus('Error saving settings: ' + error.message, 'error');
    }
  }

  getPrompts() {
    const prompts = [];
    document.querySelectorAll('.prompt-item').forEach(item => {
      const label = item.querySelector('.prompt-label').value.trim();
      const prompt = item.querySelector('.prompt-text').value.trim();
      const urlPattern = item.querySelector('.prompt-url').value.trim();

      if (label && prompt) {
        prompts.push({ label, prompt, urlPattern });
      }
    });
    return prompts;
  }

  showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = type;
    status.style.display = 'block';
    setTimeout(() => {
      status.style.display = 'none';
    }, 3000);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => new OptionsController());