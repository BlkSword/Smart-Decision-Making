/**
 * Safe clipboard utilities that handle permission errors gracefully
 */

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Check if clipboard API is available
    if (!navigator.clipboard) {
      // Fallback to deprecated execCommand
      return fallbackCopyToClipboard(text);
    }

    // Try to use the modern clipboard API
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    // If clipboard API fails due to permissions, try fallback
    console.warn('Clipboard API failed, trying fallback:', error);
    return fallbackCopyToClipboard(text);
  }
}

function fallbackCopyToClipboard(text: string): boolean {
  try {
    // Create a temporary textarea element
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    // Try to copy using execCommand
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);

    return successful;
  } catch (error) {
    console.error('Fallback clipboard copy failed:', error);
    return false;
  }
}

export async function readFromClipboard(): Promise<string | null> {
  try {
    if (!navigator.clipboard) {
      console.warn('Clipboard API not available');
      return null;
    }

    const text = await navigator.clipboard.readText();
    return text;
  } catch (error) {
    console.warn('Failed to read from clipboard:', error);
    return null;
  }
}

export function isClipboardSupported(): boolean {
  return !!(navigator.clipboard || document.execCommand);
}