import { getSiteConfig } from "./dataLoader";

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

// Proxy: SITE_CONFIG.foo sempre lê o valor atual do dataLoader.
// Funciona porque o componente que consome também chama useDataVersion() pra re-renderizar.
export const SITE_CONFIG: SiteConfig = new Proxy({} as SiteConfig, {
  get(_target, prop) {
    return (getSiteConfig() as unknown as Record<string | symbol, unknown>)[prop];
  },
});