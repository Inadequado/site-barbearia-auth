import { useSyncExternalStore } from "react";
import type { SiteConfig } from "./siteConfig";
import type { Service } from "./services";

// Estado interno
let _siteConfig: SiteConfig | null = null;
let _services: Service[] = [];
let _version = 0;
const _listeners = new Set<() => void>();

// Carrega os 2 JSONs do backend. Chamado uma vez no boot, e novamente após save.
export async function loadAllData(): Promise<void> {
  const [configRes, servicesRes] = await Promise.all([
    fetch("/api/public/site-config", { credentials: "same-origin" }),
    fetch("/api/public/services", { credentials: "same-origin" }),
  ]);

  if (!configRes.ok) throw new Error(`Falha ao carregar site-config: ${configRes.status}`);
  if (!servicesRes.ok) throw new Error(`Falha ao carregar services: ${servicesRes.status}`);

  _siteConfig = await configRes.json();
  _services = await servicesRes.json();
  _version++;
  _listeners.forEach((fn) => fn());
}

// Getters síncronos — só funcionam depois do loadAllData() inicial
export function getSiteConfig(): SiteConfig {
  if (!_siteConfig) throw new Error("getSiteConfig chamado antes do loadAllData");
  return _siteConfig;
}

export function getServices(): Service[] {
  return _services;
}

// Hook React que força re-render quando os dados mudam
function subscribe(callback: () => void) {
  _listeners.add(callback);
  return () => { _listeners.delete(callback); };
}

function getVersion() {
  return _version;
}

export function useDataVersion(): number {
  return useSyncExternalStore(subscribe, getVersion, getVersion);
}