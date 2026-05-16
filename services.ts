import servicesData from './services-data.json';

export type ServiceCategory = string;

export interface Service {
  id: number;
  slug: string;
  category: ServiceCategory;
  name: string;
  desc: string;
  price: string;
}

export const SERVICES: Service[] = servicesData as Service[];

export function getServiceBySlug(slug: string | null | undefined): Service | null {
  if (!slug) return null;
  return SERVICES.find((service) => service.slug === slug) ?? null;
}

export function getServiceByName(name: string | null | undefined): Service | null {
  if (!name) return null;
  return SERVICES.find((service) => service.name === name) ?? null;
}
