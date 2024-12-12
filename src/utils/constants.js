export const API_ENDPOINTS = {
  OPENAI: 'https://api.openai.com/v1/chat/completions'
};

export const DEFAULT_SETTINGS = {
  API_KEY: '',
  MODEL: 'gpt-3.5-turbo',
  MAX_LENGTH: 10000
};

export const MUTATION_OBSERVER_CONFIG = {
  childList: true,
  subtree: true,
  attributes: true
};
