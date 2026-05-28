import { describe, expect, it } from "vitest";
import { createEnv, createGroupKey, type GlobalState } from "../model/env";
import { getActionEnv } from "./action-icon";

describe("action icon helpers", () => {
  it("uses the active group env for the action badge", () => {
    const groupKey = createGroupKey(1, 2);
    const env = {
      ...createEnv({
        name: "preview_checkout",
        hostname: "example.com",
        groupKey,
        now: 1
      }),
      enabled: true,
      filters: { domains: ["example.com"], paths: [], excludedDomains: [] }
    };
    const state: GlobalState = {
      enabled: true,
      autoSwitch: true,
      selectedEnvId: env.id,
      envs: { [env.id]: env },
      templates: {},
      globalWorkspace: { items: [] },
      groupBindings: {
        [groupKey]: {
          groupKey,
          envId: env.id,
          chromeGroupId: 2,
          windowId: 1,
          title: "Preview",
          lastSeenTabUrls: [],
          updatedAt: 1
        }
      },
      ruleMeta: { activeRuleIds: [] }
    };

    expect(getActionEnv(state, { groupKey })?.id).toBe(env.id);
  });

  it("uses a group env without domain filters", () => {
    const groupKey = createGroupKey(1, 2);
    const env = {
      ...createEnv({ name: "Preview", groupKey, now: 1 }),
      enabled: true,
      filters: { domains: [], paths: [], excludedDomains: [] }
    };
    const state: GlobalState = {
      enabled: true,
      autoSwitch: true,
      selectedEnvId: env.id,
      envs: { [env.id]: env },
      templates: {},
      globalWorkspace: { items: [] },
      groupBindings: {
        [groupKey]: {
          groupKey,
          envId: env.id,
          chromeGroupId: 2,
          windowId: 1,
          title: "Preview",
          lastSeenTabUrls: [],
          updatedAt: 1
        }
      },
      ruleMeta: { activeRuleIds: [] }
    };

    expect(getActionEnv(state, { groupKey })?.id).toBe(env.id);
  });

  it("does not show an env when the extension is disabled", () => {
    const env = createEnv({ name: "Preview", hostname: "example.com", now: 1 });
    const state: GlobalState = {
      enabled: false,
      autoSwitch: true,
      selectedEnvId: env.id,
      envs: { [env.id]: env },
      templates: {},
      globalWorkspace: { items: [] },
      groupBindings: {},
      ruleMeta: { activeRuleIds: [] }
    };

    expect(getActionEnv(state, {})).toBeUndefined();
  });

  it("does not show an env for an unbound active group without a global env", () => {
    const boundGroupKey = createGroupKey(1, 2);
    const activeGroupKey = createGroupKey(1, 3);
    const env = {
      ...createEnv({ name: "Preview", groupKey: boundGroupKey, now: 1 }),
      enabled: true,
      filters: { domains: ["example.com"], paths: [], excludedDomains: [] }
    };
    const state: GlobalState = {
      enabled: true,
      autoSwitch: true,
      selectedEnvId: env.id,
      envs: { [env.id]: env },
      templates: {},
      globalWorkspace: { items: [] },
      groupBindings: {
        [boundGroupKey]: {
          groupKey: boundGroupKey,
          envId: env.id,
          chromeGroupId: 2,
          windowId: 1,
          title: "Preview",
          lastSeenTabUrls: [],
          updatedAt: 1
        }
      },
      ruleMeta: { activeRuleIds: [] }
    };

    expect(getActionEnv(state, { groupKey: activeGroupKey })).toBeUndefined();
  });

  it("uses a global env when the active group has no env", () => {
    const activeGroupKey = createGroupKey(1, 3);
    const env = {
      ...createEnv({ name: "Global Preview", now: 1 }),
      enabled: true,
      scope: "global" as const,
      filters: { domains: ["example.com"], paths: [], excludedDomains: [] }
    };
    const state: GlobalState = {
      enabled: true,
      autoSwitch: true,
      selectedEnvId: env.id,
      envs: { [env.id]: env },
      templates: {},
      globalWorkspace: { items: [] },
      groupBindings: {},
      ruleMeta: { activeRuleIds: [] }
    };

    expect(getActionEnv(state, { groupKey: activeGroupKey })?.id).toBe(env.id);
  });
});
