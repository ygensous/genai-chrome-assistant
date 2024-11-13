export class StorageService {
  async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(
        ['apiKey', 'model', 'maxLength'],
        (result) => resolve(result)
      );
    });
  }

  async saveSettings(settings) {
    return new Promise((resolve) => {
      chrome.storage.sync.set(settings, resolve);
    });
  }
}
