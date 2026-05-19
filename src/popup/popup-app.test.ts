import { describe, expect, it } from "vitest";
import { createEnv, createGroupKey, type GlobalState } from "../model/env";
import { appendListValue, deleteEnv, reorderEnvs, selectEnvManually } from "./popup-app";

describe("popup state helpers", () => {
  it("deletes the final env without leaving a stale selected env", () => {
    const groupKey = createGroupKey(1, 2);
    const env = createEnv({
      name: "Checkout",
      hostname: "pre.example.com",
      groupKey,
      now: 1
    });
    const state: GlobalState = {
      enabled: true,
      autoSwitch: true,
      selectedEnvId: env.id,
      envs: { [env.id]: env },
      templates: {},
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
      },
      ruleMeta: { activeRuleIds: [10000] }
    };

    const next = deleteEnv(state, env.id);

    expect(next.selectedEnvId).toBeUndefined();
    expect(next.envs).toEqual({});
    expect(next.groupBindings).toEqual({});
  });

  it("switches to manual mode when selecting a different env from the list", () => {
    const envA = createEnv({ name: "A", hostname: "a.example.com", now: 1 });
    const envB = createEnv({ name: "B", hostname: "b.example.com", now: 2 });
    const state: GlobalState = {
      enabled: true,
      autoSwitch: true,
      selectedEnvId: envA.id,
      envs: { [envA.id]: envA, [envB.id]: envB },
      templates: {},
      groupBindings: {},
      ruleMeta: { activeRuleIds: [] }
    };

    const next = selectEnvManually(state, envB.id);

    expect(next.selectedEnvId).toBe(envB.id);
    expect(next.autoSwitch).toBe(false);
  });

  it("reorders envs without changing selection or bindings", () => {
    const envA = createEnv({ name: "A", hostname: "a.example.com", now: 1 });
    const envB = createEnv({ name: "B", hostname: "b.example.com", now: 2 });
    const envC = createEnv({ name: "C", hostname: "c.example.com", now: 3 });
    const groupKey = createGroupKey(1, 3);
    const state: GlobalState = {
      enabled: true,
      autoSwitch: false,
      selectedEnvId: envB.id,
      envs: { [envA.id]: envA, [envB.id]: envB, [envC.id]: envC },
      templates: {},
      groupBindings: {
        [groupKey]: {
          groupKey,
          envId: envB.id,
          chromeGroupId: 3,
          windowId: 1,
          title: "B",
          lastSeenTabUrls: [],
          updatedAt: 1
        }
      },
      ruleMeta: { activeRuleIds: [] }
    };

    const next = reorderEnvs(state, envC.id, envA.id);

    expect(Object.keys(next.envs)).toEqual([envC.id, envA.id, envB.id]);
    expect(next.selectedEnvId).toBe(envB.id);
    expect(next.groupBindings).toBe(state.groupBindings);
  });

  it("appends current hostname to comma-separated filter drafts without duplicates", () => {
    expect(appendListValue("", "pre.example.com")).toBe("pre.example.com");
    expect(appendListValue("api.example.com", "pre.example.com")).toBe(
      "api.example.com, pre.example.com"
    );
    expect(appendListValue("pre.example.com", "PRE.example.com")).toBe("pre.example.com");
  });
});
