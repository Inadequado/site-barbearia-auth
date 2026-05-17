import raw from './data/site-config.json';

export interface CategoryConfig {
  id: string;
  label: string;
  active: boolean;
}

export interface SiteConfig {
  heroLine1: string;
  heroName: string;
  ctaLabel: string;
  categories: CategoryConfig[];
}

export const SITE_CONFIG: SiteConfig = raw as SiteConfig;
