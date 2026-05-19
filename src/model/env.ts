export type RuleMeta = {
  activeRuleIds: number[];
  lastCompiledAt?: number;
};

export type GlobalState = {
  enabled: boolean;
  autoSwitch: boolean;
  selectedEnvId?: string;
  envs: Record<string, Env>;
  templates: Record<string, EnvTemplate>;
  groupBindings: Record<string, GroupBinding>;
  ruleMeta: RuleMeta;
};

export type Env = {
  id: string;
  name: string;
  enabled: boolean;
  scope: EnvScope;
  linkedGroupKeys: string[];
  filters: EnvFilters;
  rules: EnvRules;
  createdAt: number;
  updatedAt: number;
};

export type EnvScope = "group" | "global";

export type GroupBinding = {
  groupKey: string;
  envId: string;
  chromeGroupId?: number;
  windowId?: number;
  title?: string;
  color?: string;
  lastSeenTabUrls: string[];
  unresolved?: boolean;
  updatedAt: number;
};

export type EnvFilters = {
  domains: string[];
  paths: string[];
  excludedDomains: string[];
};

export type EnvRules = {
  headers: HeaderRule[];
  queries: QueryRule[];
};

export type EnvTemplate = {
  id: string;
  name: string;
  filters: EnvFilters;
  headers: HeaderRule[];
  createdAt: number;
  updatedAt: number;
};

export type HeaderRule = {
  id: string;
  enabled: boolean;
  name: string;
  value: string;
  valueSource?: TemplateValueSource;
  description?: string;
};

export type TemplateValueSource = {
  type: "xpath" | "css";
  selector: string;
  attribute?: string;
};

export type QueryRule = {
  id: string;
  enabled: boolean;
  key: string;
  value: string;
};

export type ActiveContext = {
  tabId?: number;
  windowId?: number;
  groupId?: number;
  groupKey?: string;
  groupTitle?: string;
  groupColor?: string;
  availableGroups?: AvailableTabGroup[];
  url?: string;
  hostname?: string;
};

export type AvailableTabGroup = {
  groupKey: string;
  groupId: number;
  windowId: number;
  title: string;
  color?: string;
};

export type MatchStatus =
  | "active"
  | "paused"
  | "no-tab"
  | "no-group"
  | "no-env"
  | "env-disabled"
  | "no-domain"
  | "not-matched";

export type MatchDiagnostics = {
  status: MatchStatus;
  envId?: string;
  message: string;
  matchedDomain?: boolean;
  matchedPath?: boolean;
  excluded?: boolean;
  headerCount: number;
  queryCount: number;
};

export function createEmptyState(now = Date.now()): GlobalState {
  return {
    enabled: true,
    autoSwitch: true,
    selectedEnvId: undefined,
    envs: {},
    templates: {},
    groupBindings: {},
    ruleMeta: {
      activeRuleIds: []
    }
  };
}

export function createEnv({
  name,
  groupKey,
  now = Date.now()
}: {
  name: string;
  hostname?: string;
  groupKey?: string;
  now?: number;
}): Env {
  const id = createId("env");
  return {
    id,
    name: name.trim() || "新环境",
    enabled: false,
    scope: "group",
    linkedGroupKeys: groupKey ? [groupKey] : [],
    filters: {
      domains: [],
      paths: [],
      excludedDomains: []
    },
    rules: {
      headers: [],
      queries: []
    },
    createdAt: now,
    updatedAt: now
  };
}

export function createHeaderRule(input: Partial<HeaderRule> = {}): HeaderRule {
  return {
    id: createId("hdr"),
    enabled: true,
    name: "",
    value: "",
    ...input
  };
}

export function parseTemplateValueSourceInput(input: string): TemplateValueSource | undefined {
  const value = input.trim();
  if (!value) {
    return undefined;
  }

  const prefixed = value.match(/^(xpath|css)\s*[:=]\s*(.*)$/i);
  const type = prefixed?.[1].toLowerCase() === "css" ? "css" : "xpath";
  const body = prefixed ? prefixed[2].trim() : value;
  if (!body) {
    return undefined;
  }

  if (type === "css") {
    const { selector, attribute } = parseCssSelectorSource(body);
    return selector ? { type, selector, ...(attribute ? { attribute } : {}) } : undefined;
  }

  return { type, selector: body };
}

export function formatTemplateValueSourceInput(source?: TemplateValueSource): string {
  const sanitized = sanitizeTemplateValueSource(source);
  if (!sanitized) {
    return "";
  }
  if (sanitized.type === "css") {
    return `css:${sanitized.selector}${sanitized.attribute ? `@${sanitized.attribute}` : ""}`;
  }
  return `xpath:${sanitized.selector}`;
}

export function createQueryRule(): QueryRule {
  return {
    id: createId("qry"),
    enabled: true,
    key: "",
    value: ""
  };
}

export function createGroupKey(windowId: number, groupId: number): string {
  return `chrome:${windowId}:${groupId}`;
}

export function duplicateEnv(env: Env, now = Date.now()): Env {
  const copyId = createId("env");
  return {
    ...structuredClone(env),
    id: copyId,
    name: `${env.name} 副本`,
    scope: env.scope,
    linkedGroupKeys: [],
    createdAt: now,
    updatedAt: now
  };
}

export function createEnvTemplate({
  name,
  now = Date.now()
}: {
  name: string;
  now?: number;
}): EnvTemplate {
  return {
    id: createId("tpl"),
    name: name.trim() || "新模板",
    filters: {
      domains: [],
      paths: [],
      excludedDomains: []
    },
    headers: [createHeaderRule({ name: "", value: "" })],
    createdAt: now,
    updatedAt: now
  };
}

export function applyTemplateToEnv(env: Env, template: EnvTemplate, now = Date.now()): Env {
  return sanitizeEnv({
    ...env,
    enabled: template.filters.domains.some((domain) => domain.trim()),
    filters: {
      domains: [...template.filters.domains],
      paths: [...template.filters.paths],
      excludedDomains: [...template.filters.excludedDomains]
    },
    rules: {
      ...env.rules,
      headers: template.headers
        .filter((rule) => rule.name.trim())
        .map((rule) =>
          createHeaderRule({
            enabled: true,
            name: rule.name,
            value: rule.value,
            description: rule.description
          })
        )
    },
    updatedAt: now
  });
}

export function isEnvEmptyForTemplate(env: Env): boolean {
  return (
    env.filters.domains.length === 0 &&
    env.filters.paths.length === 0 &&
    env.filters.excludedDomains.length === 0 &&
    env.rules.headers.length === 0 &&
    env.rules.queries.length === 0
  );
}

export function sanitizeEnv(env: Env): Env {
  const hasDomains = env.filters.domains.some((domain) => domain.trim());
  return {
    ...env,
    scope: env.scope ?? "group",
    enabled: env.enabled && hasDomains,
    name: env.name.trim() || "新环境",
    filters: {
      domains: cleanList(env.filters.domains),
      paths: cleanList(env.filters.paths),
      excludedDomains: cleanList(env.filters.excludedDomains)
    },
    rules: {
      headers: env.rules.headers
        .map((rule) => ({
          ...rule,
          enabled: true,
          name: rule.name.trim(),
          value: rule.value.trim(),
          valueSource: undefined
        }))
        .filter((rule) => rule.name),
      queries: env.rules.queries
        .map((rule) => ({
          ...rule,
          enabled: true,
          key: rule.key.trim(),
          value: rule.value.trim()
        }))
        .filter((rule) => rule.key)
    }
  };
}

export function sanitizeEnvTemplate(template: EnvTemplate): EnvTemplate {
  return {
    ...template,
    name: template.name.trim() || "新模板",
    filters: {
      domains: cleanList(template.filters.domains),
      paths: cleanList(template.filters.paths),
      excludedDomains: cleanList(template.filters.excludedDomains)
    },
    headers: template.headers.map((rule) => ({
      ...rule,
      enabled: true,
      name: rule.name.trim(),
      value: rule.value.trim(),
      valueSource: sanitizeTemplateValueSource(rule.valueSource)
    }))
  };
}

export function sanitizeState(state: GlobalState): GlobalState {
  return {
    ...state,
    envs: Object.fromEntries(
      Object.entries(state.envs ?? {}).map(([envId, env]) => [envId, sanitizeEnv(env)])
    ),
    templates: Object.fromEntries(
      Object.entries(state.templates ?? {}).map(([templateId, template]) => [
        templateId,
        sanitizeEnvTemplate(template)
      ])
    ),
    groupBindings: state.groupBindings ?? {},
    ruleMeta: state.ruleMeta ?? { activeRuleIds: [] },
    enabled: state.enabled ?? true,
    autoSwitch: state.autoSwitch ?? true
  };
}

export function reconcileGroupBindings(
  state: GlobalState,
  availableGroups: AvailableTabGroup[],
  now = Date.now()
): GlobalState {
  if (!availableGroups.length || !Object.keys(state.groupBindings).length) {
    return state;
  }

  const availableByKey = new Map(availableGroups.map((group) => [group.groupKey, group]));
  const bindings = Object.entries(state.groupBindings);
  const plannedKeys = new Map<string, string>();

  for (const [groupKey, binding] of bindings) {
    const target = findRestoredGroup(binding, availableGroups, availableByKey);
    if (target && !state.groupBindings[target.groupKey]) {
      plannedKeys.set(groupKey, target.groupKey);
    }
  }

  let changed = false;
  let nextEnvs = state.envs;
  const nextBindings: Record<string, GroupBinding> = {};

  for (const [groupKey, binding] of bindings) {
    const restoredGroupKey = plannedKeys.get(groupKey);
    const restoredGroup = restoredGroupKey ? availableByKey.get(restoredGroupKey) : undefined;
    const currentGroup = availableByKey.get(groupKey);
    const freshGroup =
      currentGroup && (!binding.title || normalizeTitle(currentGroup.title) === normalizeTitle(binding.title))
        ? currentGroup
        : undefined;
    const nextGroup = restoredGroup ?? freshGroup;

    if (nextGroup) {
      const nextBinding: GroupBinding = {
        ...binding,
        groupKey: nextGroup.groupKey,
        chromeGroupId: nextGroup.groupId,
        windowId: nextGroup.windowId,
        title: nextGroup.title,
        color: nextGroup.color,
        unresolved: false,
        updatedAt:
          nextGroup.groupKey !== binding.groupKey || binding.unresolved ? now : binding.updatedAt
      };
      nextBindings[nextGroup.groupKey] = nextBinding;

      if (nextGroup.groupKey !== groupKey) {
        nextEnvs = replaceEnvLinkedGroupKey(nextEnvs, binding.envId, groupKey, nextGroup.groupKey, now);
        changed = true;
      }
      if (
        nextBinding.chromeGroupId !== binding.chromeGroupId ||
        nextBinding.windowId !== binding.windowId ||
        nextBinding.title !== binding.title ||
        nextBinding.color !== binding.color ||
        nextBinding.unresolved !== binding.unresolved ||
        nextBinding.updatedAt !== binding.updatedAt
      ) {
        changed = true;
      }
      continue;
    }

    const nextBinding = {
      ...binding,
      unresolved: true,
      updatedAt: binding.unresolved ? binding.updatedAt : now
    };
    nextBindings[groupKey] = nextBinding;
    if (!binding.unresolved) {
      changed = true;
    }
  }

  if (!changed) {
    return state;
  }

  return {
    ...state,
    envs: nextEnvs,
    groupBindings: nextBindings
  };
}

export function summarizeRules(env: Env): string {
  const headers = env.rules.headers.filter((rule) => rule.enabled && rule.name).length;
  const queries = env.rules.queries.filter((rule) => rule.enabled && rule.key).length;
  return `${headers} 请求头 · ${queries} 查询参数`;
}

function cleanList(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .flatMap((value) => value.split(","))
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

function sanitizeTemplateValueSource(
  source?: TemplateValueSource
): TemplateValueSource | undefined {
  if (!source || (source.type !== "xpath" && source.type !== "css")) {
    return undefined;
  }
  const selector = source.selector.trim();
  if (!selector) {
    return undefined;
  }
  const attribute = source.attribute?.trim();
  return {
    type: source.type,
    selector,
    ...(attribute ? { attribute } : {})
  };
}

function findRestoredGroup(
  binding: GroupBinding,
  availableGroups: AvailableTabGroup[],
  availableByKey: Map<string, AvailableTabGroup>
): AvailableTabGroup | undefined {
  const title = normalizeTitle(binding.title);
  if (!title) {
    return undefined;
  }
  const currentGroup = availableByKey.get(binding.groupKey);
  if (currentGroup && normalizeTitle(currentGroup.title) === title) {
    return undefined;
  }
  const candidates = availableGroups.filter((group) => normalizeTitle(group.title) === title);
  return candidates.length === 1 ? candidates[0] : undefined;
}

function replaceEnvLinkedGroupKey(
  envs: Record<string, Env>,
  envId: string,
  oldGroupKey: string,
  newGroupKey: string,
  now: number
): Record<string, Env> {
  const env = envs[envId];
  if (!env) {
    return envs;
  }
  return {
    ...envs,
    [envId]: {
      ...env,
      linkedGroupKeys: Array.from(
        new Set(env.linkedGroupKeys.map((groupKey) => (groupKey === oldGroupKey ? newGroupKey : groupKey)))
      ),
      updatedAt: now
    }
  };
}

function normalizeTitle(title?: string): string {
  return title?.trim().toLowerCase() ?? "";
}

function parseCssSelectorSource(input: string): { selector: string; attribute?: string } {
  if (input.endsWith("::text")) {
    return { selector: input.slice(0, -"::text".length).trim() };
  }
  const attributeSeparatorIndex = input.lastIndexOf("@");
  if (attributeSeparatorIndex <= 0) {
    return { selector: input.trim() };
  }
  const selector = input.slice(0, attributeSeparatorIndex).trim();
  const attribute = input.slice(attributeSeparatorIndex + 1).trim();
  return { selector, ...(attribute ? { attribute } : {}) };
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
