class ContentExtractorService {
  extractMainContent() {
    // Create a non-modifying copy of the elements we need
    const mainContent = document.querySelector('main, article, .main-content') || document.body;
    
    return {
      text: this.extractText(mainContent),
      tables: this.extractTables(mainContent),
      links: this.extractLinks(mainContent)
    };
  }

  extractText(element) {
    // Only read the text content
    return element.innerText;
  }

  extractTables(element) {
    // Only read table content
    return Array.from(element.querySelectorAll('table')).map(table => ({
      headers: Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim()),
      rows: Array.from(table.querySelectorAll('tr')).map(row => 
        Array.from(row.querySelectorAll('td')).map(cell => cell.textContent.trim())
      ).filter(row => row.length > 0),
      text: table.textContent.trim()
    }));
  }

  extractLinks(element) {
    // Only read link information
    return Array.from(element.querySelectorAll('a'))
      .map(link => ({
        text: link.innerText.trim(),
        href: link.href
      }))
      .filter(link => link.text && link.href);
  }
}
