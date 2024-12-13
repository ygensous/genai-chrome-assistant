export class StorageService {
  constructor() {
    this.defaultPrompts = [{
      label: 'Summarize content',
      prompt: `Please analyze and summarize this content in a structured format:

1. Main Points (2-3 bullet points)
2. Key Details (if any)
3. Context & Significance
4. Notable Quotes (if any)

Format the response with markdown-style headings using ### for sections.
Use bullet points for lists.
Put quotes in blockquote format using.`,
      urlPattern: ''  // empty means all pages
    },{
      label: 'Analyze presentation',
      prompt: `
        Please analyze the presentation with respect to the instructions below.
        - What do you understand from this presentation ? What is the main messages (maximum 3) it conveys ?
        - Does the presentation match all the instructions ? 
        - Provide ideas for improvements otherwise. Be specific on which slides should be modified.
        Setup
        - I am a tech manager in a [company type and size], building a presentation.
        - I want to pitch a proposal for [project short description]. Attached is the full business case
        - My audience is [list of main stakeholders and business or tech orientation]. Their focus is on: 
          - [Priority 1]
          - [Priority 2]
        - [Their attention will be moderate.]
        - [They will prefer images and numbers to text, with more focus on the big picture, but I should be ready to dig into more detail.]
        - [I have 1h to present my solution, including questions]

        General structure
        - As an introduction, an exec summary of the context, the objective of the project, in order to validate alignment before starting the meeting
        - It should start with the why, with a focus on what they care about: being sure that the project will solve their problems, covers all the subjects and will be delivered on time.
        - 1/ My objective at the end of the presentation: my audience have a clear view of [the solution at the end of the project, with tech choice, organization, cost and planning]
        - 2/ The success criteria of the project will be [reaching the high-level criteria of ???].
        - 3/ The presentation should outline very clearly the different steps to my solution, and how each step moves the needle on my KPIs.

        Rules
        - The slides should be clear, accurate and word efficient
        - After the introduction and the objective of the presentation
          - Each slide should explain how and why this part has an impact on project objective
          - Each slide should have action titles, e.g. instead of “Slide 3: Why This Project Matters”, you should write “Slide 3: This project will save X and accelerate Y”
          - Each slide should not address more than 1-2 topics
        - Clean up: I also consider my presentation ready when there is nothing to remove from the content..
      `,
      urlPattern: 'https://docs.google.com/presentation/*'
    },{
      label: 'Suggest answer',
      prompt: `
      This is a gmail page. Suggest an answer to the email, in the language of the original email.
      For context, I am yann.gensous@gmail.com
      `,
      urlPattern: 'https://mail.google.com/*'
    },{
      label: 'Ask for update',
      prompt: `
      This is a gmail page. Suggest a message to ask for updates, in the language of the original email.
      `,
      urlPattern: 'https://mail.google.com/*'
    },{
      label: 'Suggest positive',
      prompt: `
      This is a gmail page. Generate a positive answer to the email, in the language of the original email.
      `,
      urlPattern: 'https://mail.google.com/*'
    },{
      label: 'Suggest negative',
      prompt: `
      This is a gmail page. Generate a negative answer to the email, in the language of the original email.
      `,
      urlPattern: 'https://mail.google.com/*'
    }];
  }

  async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(
        ['apiKey', 'model', 'maxLength', 'customPrompts', 'systemMessage'],
        (result) => {
          // Initialize customPrompts with default if not set
          if (!result.customPrompts) {
            result.customPrompts = this.defaultPrompts;
            this.saveSettings({ customPrompts: this.defaultPrompts });
          }
          resolve(result);
        }
      );
    });
  }

  async saveSettings(settings) {
    return new Promise((resolve) => {
      chrome.storage.sync.set(settings, resolve);
    });
  }

  async getCustomPrompts() {
    const settings = await this.getSettings();
    return settings.customPrompts || this.defaultPrompts;
  }

  async saveCustomPrompts(prompts) {
    return this.saveSettings({ customPrompts: prompts });
  }
}