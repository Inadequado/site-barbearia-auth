import { getServices } from "./dataLoader";

export type ServiceCategory = string;

export interface Service {
  id: number;
  slug: string;
  category: ServiceCategory;
  name: string;
  desc: string;
  price: string;
}

// SERVICES é um Proxy de array: indexação, .find, .filter, .map, .length — tudo funciona.
// A cada acesso ele lê do dataLoader (que tem os dados atuais).
export const SERVICES: Service[] = new Proxy([] as Service[], {
  get(_target, prop) {
    const arr = getServices();
    const value = (arr as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? (value as Function).bind(arr) : value;
  },
  has(_target, prop) {
    return prop in getServices();
  },
});

export function getServiceBySlug(slug: string | null | undefined): Service | null {
  if (!slug) return null;
  return getServices().find((service) => service.slug === slug) ?? null;
}

export function getServiceByName(name: string | null | undefined): Service | null {
  if (!name) return null;
  return getServices().find((service) => service.name === name) ?? null;
}