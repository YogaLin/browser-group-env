import type { EnvFilters } from "./env";

export function envCanEnable(filters: EnvFilters): boolean {
  return true;
}

export function matchFilters(url: string | undefined, filters: EnvFilters) {
  if (!url) {
    return {
      matched: false,
      matchedDomain: false,
      matchedPath: false,
      excluded: false
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return {
      matched: false,
      matchedDomain: false,
      matchedPath: false,
      excluded: false
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname || "/";
  const excluded = filters.excludedDomains.some((domain) => domainMatches(hostname, domain));
  const matchedDomain =
    filters.domains.length === 0 || filters.domains.some((domain) => domainMatches(hostname, domain));
  const matchedPath =
    filters.paths.length === 0 || filters.paths.some((path) => pathMatches(pathname, path));

  return {
    matched: matchedDomain && matchedPath && !excluded,
    matchedDomain,
    matchedPath,
    excluded
  };
}

export function domainMatches(hostname: string, pattern: string): boolean {
  const normalizedPattern = pattern.trim().toLowerCase();
  if (!normalizedPattern) {
    return false;
  }
  if (normalizedPattern.startsWith("*.")) {
    const root = normalizedPattern.slice(2);
    return hostname.endsWith(`.${root}`) && hostname !== root;
  }
  return hostname === normalizedPattern;
}

export function pathMatches(pathname: string, pattern: string): boolean {
  const normalizedPattern = pattern.trim();
  if (!normalizedPattern || normalizedPattern === "*") {
    return true;
  }
  const escaped = normalizedPattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replaceAll("\\*", ".*");
  return new RegExp(`^${escaped}`).test(pathname);
}

export function toUrlFilter(domain: string, path?: string): string {
  const normalizedDomain = domain.trim().toLowerCase();
  const normalizedPath = normalizePath(path);
  if (normalizedDomain.startsWith("*.")) {
    return `||${normalizedDomain.slice(2)}${normalizedPath}`;
  }
  return `||${normalizedDomain}${normalizedPath}`;
}

export function normalizePath(path?: string): string {
  if (!path || path === "*") {
    return "/";
  }
  const trimmed = path.trim();
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withSlash.replace(/\*+$/, "");
}
