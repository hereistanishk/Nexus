import { Timestamp } from 'firebase/firestore';

export interface Site {
  id: string;
  name: string;
  url: string;
  icon?: string;
  order: number;
  isFavorite?: boolean;
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

export type NewSite = Omit<Site, 'id' | 'createdAt' | 'userId'>;
