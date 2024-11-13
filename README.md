# Smart Page Analyzer Chrome Extension

A Chrome extension that uses OpenAI's GPT models to analyze web pages and extract meaningful insights.

## Architecture

The extension consists of several key components:

### Content Script (content.js)
- Runs in the context of web pages
- Handles DOM manipulation and content extraction
- Observes page changes and extracts structured data

### Popup Interface (popup.js, popup.html)
- Provides the user interface for the extension
- Handles user interactions and displays results
- Communicates with the content script and OpenAI API

### Background Script (background.js)
- Manages cross-component communication
- Handles extension lifecycle events

### Options Page (options.js, options.html)
- Manages user configuration
- Stores API keys and preferences

## Key Features
- Page content summarization
- Table data extraction and analysis
- Relevant link extraction
- AI-powered content analysis

## Setup
1. Install the extension
2. Configure your OpenAI API key in the options page
3. Click the extension icon to analyze any webpage

## API Usage & Costs
The extension uses OpenAI's GPT-3.5-turbo model. Approximate costs per operation:
- Summarize: ~$0.002 per average news article (about 2000 tokens)
- Extract Links: ~$0.001 per analysis (about 1000 tokens)
- Extract Tables: ~$0.001-0.002 depending on table size

Note: These are estimates based on OpenAI's pricing of $0.001 per 1K input tokens and $0.002 per 1K output tokens. Actual costs may vary depending on content length and complexity.

## Technical Details
- Uses Manifest V3
- Implements async/await patterns for API communication
- Employs MutationObserver for dynamic content handling
