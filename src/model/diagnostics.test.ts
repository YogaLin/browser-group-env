import { describe, expect, it } from "vitest";
import { createEmptyState, createGroupKey, type Env, type GlobalState } from "./env";
import { getDiagnostics } from "./diagnostics";

describe("getDiagnostics", () => {
  it("treats empty domain filters as active when the env is enabled", () => {
    const state = makeState({
      filters: { domains: [], paths: [], excludedDomains: [] }
    });

    const diagnostics = getDiagnostics(state, {
      tabId: 101,
      groupKey,
      url: "https://pre.example.com"
    });

    expect(diagnostics.status).toBe("active");
    expect(diagnostics.message).toBe("当前页面会应用环境规则");
  });

  it("reports a disabled env with an actionable reason when domains exist", () => {
    const state = makeState({ enabled: false });

    const diagnostics = getDiagnostics(state, {
      tabId: 101,
      groupKey,
      url: "https://pre.example.com"
    });

    expect(diagnostics.status).toBe("env-disabled");
    expect(diagnostics.message).toBe("当前环境已关闭，请在环境设置中启用");
  });
});

const groupKey = createGroupKey(1, 2);

function makeState(envPatch: Partial<Env> = {}): GlobalState {
  const state = createEmptyState(1);
  const env: Env = {
    id: "env_test",
    name: "Checkout",
    enabled: true,
    scope: "group",
    linkedGroupKeys: [groupKey],
    filters: { domains: ["pre.example.com"], paths: [], excludedDomains: [] },
    rules: { headers: [], queries: [] },
    workspace: { items: [], todos: [], notes: "" },
    createdAt: 1,
    updatedAt: 1,
    ...envPatch
  };

  return {
    ...state,
    selectedEnvId: env.id,
    envs: { [env.id]: env },
    groupBindings: {
      [groupKey]: {
        groupKey,
        envId: env.id,
        chromeGroupId: 2,
        windowId: 1,
        title: "Checkout",
        lastSeenTabUrls: [],
        updatedAt: 1
      }
    }
  };
}
