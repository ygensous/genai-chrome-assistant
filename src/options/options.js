import { StorageService } from '../services/storage.service.js';

const storageService = new StorageService();

document.addEventListener('DOMContentLoaded', async () => {
  // Load saved settings
  const settings = await storageService.getSettings();
  if (settings.apiKey) document.getElementById('apiKey').value = settings.apiKey;
  if (settings.model) document.getElementById('model').value = settings.model;
  if (settings.maxLength) document.getElementById('maxLength').value = settings.maxLength;

  // Add save handler
  document.getElementById('save').addEventListener('click', async () => {
    const newSettings = {
      apiKey: document.getElementById('apiKey').value,
      model: document.getElementById('model').value,
      maxLength: parseInt(document.getElementById('maxLength').value, 10)
    };

    await storageService.saveSettings(newSettings);
    showStatus('Settings saved successfully!', 'success');
  });
});

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = type;
  status.style.display = 'block';
  setTimeout(() => {
    status.style.display = 'none';
  }, 3000);
} 