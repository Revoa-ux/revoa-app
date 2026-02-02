export function formatMessageContent(content: string): string {
  // Convert markdown bold (**text**) to HTML
  let formatted = content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Convert markdown italic (*text*) to HTML
  formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Convert line breaks to <br> tags while preserving paragraph spacing
  formatted = formatted.replace(/\n\n/g, '</p><p>');
  formatted = formatted.replace(/\n/g, '<br>');

  // Wrap in paragraph tags if not already wrapped
  if (!formatted.startsWith('<p>')) {
    formatted = `<p>${formatted}</p>`;
  }

  return formatted;
}

export function shouldFormatAsMarkdown(content: string): boolean {
  // Check if the message contains markdown formatting
  return /\*\*[^*]+\*\*/.test(content) || /\*[^*]+\*/.test(content);
}
