import { Timestamp } from 'firebase/firestore';

export interface Site {
  id: string;
  name: string;
  url: string;
  icon?: string;
  order: number;
  isFavorite?: boolean;
  isLocked?: boolean;
  userId: string;
  createdAt: Timestamp;
}

export interface Profile {
  id: string;
  displayName: string;
  photoURL: string;
  bio: string;
  headline: string;
  email: string;
  location?: string;
  socialLinks?: {
    github?: string;
    linkedin?: string;
    website?: string;
  };
}

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  url: string;
  createdAt: Timestamp;
}

export interface StoreApp {
  id: string;
  title: string;
  description: string;
  developerId: string;
  developerName: string;
  iconURL: string;
  bannerURL?: string;
  category: 'web' | 'apk' | 'utility' | 'game';
  downloadURL: string; // For APKs or Web links
  isAPK: boolean;
  downloads: number;
  rating: number;
  createdAt: Timestamp;
}

export type NewSite = Omit<Site, 'id' | 'createdAt' | 'userId'>;
