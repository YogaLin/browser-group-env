import { describe, expect, it } from "vitest";
import { createEmptyState, createGroupKey, type Env, type GlobalState } from "./env";
import { compileSessionRules } from "./dnr";

describe("compileSessionRules", () => {
  it("returns no rules while paused", () => {
    const state = makeState();
    expect(compileSessionRules({ ...state, enabled: false }, { [groupKey]: [101] })).toEqual([]);
  });

  it("compiles header and query replace rules scoped by tab ids", () => {
    const state = makeState();
    const rules = compileSessionRules(state, { [groupKey]: [101, 102] });

    expect(rules).toHaveLength(2);
    expect(rules[0].action.type).toBe("modifyHeaders");
    expect(rules[0].condition.tabIds).toEqual([101, 102]);
    expect(rules[1].action.type).toBe("redirect");
    expect(rules[1].action.redirect?.transform?.queryTransform?.addOrReplaceParams).toEqual([
      { key: "env", value: "feature-checkout", replaceOnly: false }
    ]);
  });

  it("compiles envs without domains for every page in the bound group", () => {
    const state = makeState();
    const env = Object.values(state.envs)[0];
    const withoutDomains: GlobalState = {
      ...state,
      envs: {
        [env.id]: {
          ...env,
          filters: { domains: [], paths: [], excludedDomains: [] }
        }
      }
    };

    const rules = compileSessionRules(withoutDomains, { [groupKey]: [101] });

    expect(rules).toHaveLength(2);
    expect(rules[0].condition.tabIds).toEqual([101]);
    expect(rules[0].condition.urlFilter).toBe("*");
    expect(rules[0].condition.regexFilter).toBeUndefined();
  });

  it("does not compile group envs without resolved groups", () => {
    const state = makeState();
    expect(compileSessionRules(state, { [groupKey]: [] })).toEqual([]);
  });

  it("compiles path-only filters when domain filters are empty", () => {
    const state = makeState();
    const env = Object.values(state.envs)[0];
    const pathOnlyState: GlobalState = {
      ...state,
      envs: {
        [env.id]: {
          ...env,
          filters: { domains: [], paths: ["/commerce/*"], excludedDomains: [] }
        }
      }
    };

    const rules = compileSessionRules(pathOnlyState, { [groupKey]: [101] });

    expect(rules[0].condition.regexFilter).toBe("^https?://[^/]+/commerce/");
  });

  it("uses regex for wildcard domains to avoid matching root domain", () => {
    const state = makeState();
    const env = Object.values(state.envs)[0];
    const wildcardState: GlobalState = {
      ...state,
      envs: {
        [env.id]: {
          ...env,
          filters: {
            domains: ["*.example.com"],
            paths: ["/api/*"],
            excludedDomains: []
          }
        }
      }
    };
    const rules = compileSessionRules(wildcardState, { [groupKey]: [101] });
    expect(rules[0].condition.regexFilter).toContain("[^/]+\\.example\\.com");
    expect(rules[0].condition.urlFilter).toBeUndefined();
  });

  it("compiles global env without tab ids", () => {
    const state = makeState();
    const env = Object.values(state.envs)[0];
    const globalState: GlobalState = {
      ...state,
      envs: {
        [env.id]: {
          ...env,
          scope: "global",
          linkedGroupKeys: []
        }
      },
      groupBindings: {}
    };

    const rules = compileSessionRules(globalState, {});

    expect(rules).toHaveLength(2);
    expect(rules[0].condition.tabIds).toBeUndefined();
    expect(rules[0].priority).toBe(1);
  });

  it("compiles global and group envs together", () => {
    const state = makeState();
    const groupEnv = Object.values(state.envs)[0];
    const globalEnv: Env = {
      ...groupEnv,
      id: "env_global",
      name: "Global",
      scope: "global",
      linkedGroupKeys: [],
      rules: {
        headers: [{ id: "h-global", enabled: true, name: "x-global", value: "1" }],
        queries: []
      }
    };
    const combined: GlobalState = {
      ...state,
      envs: {
        [groupEnv.id]: groupEnv,
        [globalEnv.id]: globalEnv
      }
    };

    const rules = compileSessionRules(combined, { [groupKey]: [101] });

    expect(rules).toHaveLength(3);
    expect(rules.some((rule) => rule.condition.tabIds?.includes(101))).toBe(true);
    expect(rules.some((rule) => rule.condition.tabIds === undefined)).toBe(true);
  });
});

const groupKey = createGroupKey(1, 2);

function makeState(): GlobalState {
  const state = createEmptyState(1);
  const env = {
    id: "env_test",
    name: "Checkout Fix",
    enabled: true,
    scope: "group",
    linkedGroupKeys: [],
    filters: { domains: ["pre.example.com"], paths: [], excludedDomains: [] },
    rules: { headers: [], queries: [] },
    workspace: { items: [], todos: [], notes: "" },
    createdAt: 1,
    updatedAt: 1
  } satisfies Env;
  const nextEnv: Env = {
    ...env,
    linkedGroupKeys: [groupKey],
    filters: {
      domains: ["pre.example.com"],
      paths: ["/commerce/*"],
      excludedDomains: []
    },
    rules: {
      headers: [{ id: "h1", enabled: true, name: "x-env-branch", value: "feature-checkout" }],
      queries: [{ id: "q1", enabled: true, key: "env", value: "feature-checkout" }]
    }
  };
  return {
    ...state,
    selectedEnvId: nextEnv.id,
    envs: { [nextEnv.id]: nextEnv },
    groupBindings: {
      [groupKey]: {
        groupKey,
        envId: nextEnv.id,
        chromeGroupId: 2,
        windowId: 1,
        title: "Checkout",
        lastSeenTabUrls: [],
        updatedAt: 1
      }
    }
  };
}
