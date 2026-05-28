import type { Env, GlobalState, GroupBinding } from "./env";
import { normalizePath, toUrlFilter } from "./filters";

export const RULE_ID_BASE = 10000;
export const DNR_RESOURCE_TYPES: chrome.declarativeNetRequest.ResourceType[] = [
  "main_frame" as chrome.declarativeNetRequest.ResourceType,
  "sub_frame" as chrome.declarativeNetRequest.ResourceType,
  "xmlhttprequest" as chrome.declarativeNetRequest.ResourceType,
  "ping" as chrome.declarativeNetRequest.ResourceType,
  "csp_report" as chrome.declarativeNetRequest.ResourceType,
  "media" as chrome.declarativeNetRequest.ResourceType,
  "websocket" as chrome.declarativeNetRequest.ResourceType,
  "other" as chrome.declarativeNetRequest.ResourceType
];

export type ResolvedTabsByGroup = Record<string, number[]>;
type UrlCondition = Pick<
  chrome.declarativeNetRequest.RuleCondition,
  "urlFilter" | "regexFilter" | "excludedRequestDomains"
>;

export function compileSessionRules(
  state: GlobalState,
  tabsByGroup: ResolvedTabsByGroup
): chrome.declarativeNetRequest.Rule[] {
  if (!state.enabled) {
    return [];
  }

  const rules: chrome.declarativeNetRequest.Rule[] = [];
  let nextRuleId = RULE_ID_BASE;

  for (const env of Object.values(state.envs)) {
    if (!env.enabled) {
      continue;
    }

    const tabIds = collectTabIds(env, state.groupBindings, tabsByGroup);
    if (env.scope !== "global" && tabIds.length === 0) {
      continue;
    }

    const urlConditions = createUrlConditions(env);
    const requestHeaders = createHeaderActions(env);
    const queryParams = env.rules.queries
      .filter((rule) => rule.enabled && rule.key)
      .map((rule) => ({
        key: rule.key,
        value: rule.value,
        replaceOnly: false
      }));

    for (const urlCondition of urlConditions) {
      if (requestHeaders.length > 0) {
        rules.push({
          id: nextRuleId++,
          priority: getRulePriority(env),
          action: {
            type: "modifyHeaders" as chrome.declarativeNetRequest.RuleActionType,
            requestHeaders
          },
          condition: {
            ...createTabCondition(env, tabIds),
            ...urlCondition,
            resourceTypes: DNR_RESOURCE_TYPES
          }
        });
      }

      if (queryParams.length > 0) {
        rules.push({
          id: nextRuleId++,
          priority: getRulePriority(env),
          action: {
            type: "redirect" as chrome.declarativeNetRequest.RuleActionType,
            redirect: {
              transform: {
                queryTransform: {
                  addOrReplaceParams: queryParams
                }
              }
            }
          },
          condition: {
            ...createTabCondition(env, tabIds),
            ...urlCondition,
            resourceTypes: [
              "main_frame" as chrome.declarativeNetRequest.ResourceType,
              "sub_frame" as chrome.declarativeNetRequest.ResourceType,
              "xmlhttprequest" as chrome.declarativeNetRequest.ResourceType,
              "ping" as chrome.declarativeNetRequest.ResourceType,
              "other" as chrome.declarativeNetRequest.ResourceType
            ]
          }
        });
      }
    }
  }

  return rules;
}

function collectTabIds(
  env: Env,
  bindings: Record<string, GroupBinding>,
  tabsByGroup: ResolvedTabsByGroup
): number[] {
  return Array.from(
    new Set(
      env.linkedGroupKeys.flatMap((groupKey) => {
        const binding = bindings[groupKey];
        if (!binding || binding.unresolved) {
          return [];
        }
        return tabsByGroup[groupKey] ?? [];
      })
    )
  );
}

function createTabCondition(
  env: Env,
  tabIds: number[]
): Pick<chrome.declarativeNetRequest.RuleCondition, "tabIds"> {
  return env.scope === "global" ? {} : { tabIds };
}

function getRulePriority(env: Env): number {
  return env.scope === "global" ? 1 : 2;
}

function createUrlConditions(env: Env): UrlCondition[] {
  const paths = env.filters.paths.length ? env.filters.paths : [undefined];
  const excluded = new Set(env.filters.excludedDomains.map((domain) => domain.toLowerCase()));
  const excludedRequestDomains = toDnrRequestDomains(env.filters.excludedDomains);

  if (env.filters.domains.length === 0) {
    return paths.map((path) => ({
      ...toAnyDomainUrlCondition(path),
      ...(excludedRequestDomains.length ? { excludedRequestDomains } : {})
    }));
  }

  return env.filters.domains
    .filter((domain) => !excluded.has(domain.toLowerCase()))
    .flatMap((domain) =>
      paths.map((path) => ({
        ...toUrlCondition(domain, path),
        ...(excludedRequestDomains.length ? { excludedRequestDomains } : {})
      }))
    );
}

function toAnyDomainUrlCondition(path?: string): UrlCondition {
  if (!path || !path.trim() || path.trim() === "*") {
    return { urlFilter: "*" };
  }
  const normalizedPath = normalizePath(path);
  const pathRegex = escapeRegex(normalizedPath).replaceAll("\\*", ".*");
  return {
    regexFilter: `^https?://[^/]+${pathRegex}`
  };
}

function toUrlCondition(domain: string, path?: string): UrlCondition {
  const normalizedDomain = domain.trim().toLowerCase();
  if (normalizedDomain.startsWith("*.")) {
    const root = escapeRegex(normalizedDomain.slice(2));
    const normalizedPath = normalizePath(path);
    const pathRegex = escapeRegex(normalizedPath).replaceAll("\\*", ".*");
    return {
      regexFilter: `^https?://[^/]+\\.${root}${pathRegex}`
    };
  }
  return {
    urlFilter: toUrlFilter(domain, path)
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
}

function toDnrRequestDomains(domains: string[]): string[] {
  return domains
    .map((domain) => domain.trim().toLowerCase())
    .filter((domain) => domain && !domain.includes("*"));
}

function createHeaderActions(env: Env): chrome.declarativeNetRequest.ModifyHeaderInfo[] {
  const byName = new Map<string, chrome.declarativeNetRequest.ModifyHeaderInfo>();
  for (const rule of env.rules.headers) {
    if (!rule.enabled || !rule.name) {
      continue;
    }
    byName.set(rule.name.toLowerCase(), {
      header: rule.name,
      operation: "set" as chrome.declarativeNetRequest.HeaderOperation,
      value: rule.value
    });
  }
  return Array.from(byName.values());
}
