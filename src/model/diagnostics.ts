import type { ActiveContext, GlobalState, MatchDiagnostics } from "./env";
import { matchFilters } from "./filters";

export function getDiagnostics(state: GlobalState, context: ActiveContext): MatchDiagnostics {
  if (!state.enabled) {
    return empty("paused", "插件已暂停，当前不会注入规则");
  }
  if (!context.tabId) {
    return empty("no-tab", "无法读取当前标签页");
  }
  if (!context.groupKey) {
    return empty("no-group", "当前标签页不在标签组中");
  }

  const binding = state.groupBindings[context.groupKey];
  const env =
    (binding ? state.envs[binding.envId] : undefined) ??
    Object.values(state.envs).find((candidate) => candidate.scope === "global");
  if (!env) {
    return empty("no-env", binding ? "绑定的环境不存在" : "当前标签组未绑定环境");
  }
  if (!env.enabled) {
    return {
      ...empty("env-disabled", "当前环境已禁用"),
      envId: env.id
    };
  }
  if (env.filters.domains.length === 0) {
    return {
      ...empty("no-domain", "环境缺少域名过滤条件，不能启用"),
      envId: env.id
    };
  }

  const result = matchFilters(context.url, env.filters);
  const headerCount = env.rules.headers.filter((rule) => rule.enabled && rule.name).length;
  const queryCount = env.rules.queries.filter((rule) => rule.enabled && rule.key).length;

  if (!result.matched) {
    return {
      status: "not-matched",
      envId: env.id,
      message: result.excluded ? "当前页面命中排除域名" : "当前页面不在过滤器范围内",
      matchedDomain: result.matchedDomain,
      matchedPath: result.matchedPath,
      excluded: result.excluded,
      headerCount,
      queryCount
    };
  }

  return {
    status: "active",
    envId: env.id,
    message: "当前页面会应用环境规则",
    matchedDomain: true,
    matchedPath: true,
    excluded: false,
    headerCount,
    queryCount
  };
}

function empty(status: MatchDiagnostics["status"], message: string): MatchDiagnostics {
  return {
    status,
    message,
    headerCount: 0,
    queryCount: 0
  };
}
