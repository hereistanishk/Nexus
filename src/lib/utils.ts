import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getFavicon(url: string) {
  try {
    const domain = new URL(url).hostname;
    // Primary: Google Favicon service
    // Secondary: IconHorse
    // Using sz=128 for high quality
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  } catch (e) {
    return null;
  }
}

export function getFallbackFavicon(url: string) {
  try {
    const domain = new URL(url).hostname;
    return `https://icon.horse/icon/${domain}`;
  } catch (e) {
    return null;
  }
}
