export function stripHtmlFromMarkdown(markdown: string): string {
  // Remove HTML tags including images, iframes, scripts, etc.
  return markdown.replace(/<[^>]*>/g, '');
}
