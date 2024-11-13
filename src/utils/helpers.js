export function truncateContent(content, maxLength) {
  return content.length > maxLength 
    ? content.substring(0, maxLength) + '...'
    : content;
}

export function formatTableData(tables) {
  return tables.map(table => ({
    headers: table.headers,
    rows: table.rows,
    summary: table.text
  }));
}

