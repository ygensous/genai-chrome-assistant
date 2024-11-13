class ContentExtractorService {
  extractMainContent() {
    // Clone the document body to avoid modifying the actual page
    const contentClone = document.body.cloneNode(true);
    
    // Remove unwanted elements from the clone
    const elementsToRemove = contentClone.querySelectorAll('header, footer, nav, aside, script, style, iframe');
    elementsToRemove.forEach(el => el.remove());

    // Find main content in the clone
    const mainContent = contentClone.querySelector('main, article, .main-content') || contentClone;
    
    return {
      text: this.extractText(mainContent),
      tables: this.extractTables(mainContent),
      links: this.extractLinks(mainContent)
    };
  }

  extractText(element) {
    return element.innerText;
  }

  extractTables(element) {
    return Array.from(element.querySelectorAll('table')).map(table => ({
      headers: Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim()),
      rows: Array.from(table.querySelectorAll('tr')).map(row => 
        Array.from(row.querySelectorAll('td')).map(cell => cell.textContent.trim())
      ).filter(row => row.length > 0),
      text: table.textContent.trim()
    }));
  }

  extractLinks(element) {
    return Array.from(element.querySelectorAll('a'))
      .map(link => ({
        text: link.innerText.trim(),
        href: link.href
      }))
      .filter(link => link.text && link.href);
  }
}
