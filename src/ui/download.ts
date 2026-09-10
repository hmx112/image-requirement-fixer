let currentUrl: string | undefined;

export function setDownload(anchor: HTMLAnchorElement, blob: Blob, filename: string): void {
  if (currentUrl) URL.revokeObjectURL(currentUrl);
  currentUrl = URL.createObjectURL(blob);
  anchor.href = currentUrl;
  anchor.download = filename;
}

export function clearDownload(): void {
  if (currentUrl) URL.revokeObjectURL(currentUrl);
  currentUrl = undefined;
}
