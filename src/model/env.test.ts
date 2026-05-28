import { describe, expect, it } from "vitest";
import {
  applyTemplateToEnv,
  createEmptyState,
  createEnv,
  createEnvTemplate,
  createHeaderRule,
  createQueryRule,
  createWorkspaceItem,
  createWorkspaceTodo,
  duplicateEnv,
  formatTemplateValueSourceInput,
  isEnvEmptyForTemplate,
  mergeRuleRefreshState,
  parseTemplateValueSourceInput,
  reconcileGroupBindings,
  sanitizeEnv,
  sanitizeGlobalWorkspace,
  sanitizeEnvTemplate,
  sanitizeState
} from "./env";

describe("env helpers", () => {
  it("creates an empty state with auto switch enabled", () => {
    const state = createEmptyState(1);
    expect(state.autoSwitch).toBe(true);
    expect(state.selectedEnvId).toBeUndefined();
    expect(state.envs).toEqual({});
    expect(state.templates).toEqual({});
    expect(state.globalWorkspace).toEqual({ items: [] });
  });

  it("creates env without default domain filter", () => {
    const env = createEnv({ name: "Checkout", hostname: "pre.example.com", now: 1 });
    expect(env.enabled).toBe(true);
    expect(env.scope).toBe("group");
    expect(env.filters.domains).toEqual([]);
    expect(env.rules.headers).toEqual([]);
    expect(env.workspace).toEqual({ items: [], todos: [], notes: "" });
  });

  it("creates env without hostname and without filters", () => {
    const env = createEnv({ name: "No Url", now: 1 });
    expect(env.enabled).toBe(true);
    expect(env.filters.domains).toEqual([]);
  });

  it("creates enabled env without hostname", () => {
    const env = createEnv({ name: "No Host", now: 1 });
    expect(env.enabled).toBe(true);
    expect(env.filters.domains).toEqual([]);
  });

  it("keeps env enabled when domain filter is empty", () => {
    const env = createEnv({ name: "Checkout", hostname: "pre.example.com", now: 1 });
    const sanitized = sanitizeEnv({
      ...env,
      enabled: true,
      filters: { ...env.filters, domains: [] }
    });
    expect(sanitized.enabled).toBe(true);
  });

  it("migrates old disabled envs with empty domain filters to enabled", () => {
    const env = createEnv({ name: "Checkout", now: 1 });
    const sanitized = sanitizeEnv({
      ...env,
      enabled: false,
      filters: { domains: [], paths: [], excludedDomains: [] }
    });

    expect(sanitized.enabled).toBe(true);
  });

  it("normalizes individual rules as enabled", () => {
    const env = createEnv({ name: "Checkout", now: 1 });
    const sanitized = sanitizeEnv({
      ...env,
      filters: { ...env.filters, domains: ["example.com"] },
      rules: {
        headers: [{ id: "h1", enabled: false, name: "x-preview-env", value: "1" }],
        queries: [{ id: "q1", enabled: false, key: "preview", value: "branch" }]
      }
    });

    expect(sanitized.rules.headers[0].enabled).toBe(true);
    expect(sanitized.rules.queries[0].enabled).toBe(true);
  });

  it("creates blank header and query rules by default", () => {
    expect(createHeaderRule()).toMatchObject({ enabled: true, name: "", value: "" });
    expect(createQueryRule()).toMatchObject({ enabled: true, key: "", value: "" });
  });

  it("keeps blank rule drafts so popup add buttons create editable rows", () => {
    const env = createEnv({ name: "Checkout", now: 1 });
    const sanitized = sanitizeEnv({
      ...env,
      filters: { ...env.filters, domains: ["example.com"] },
      rules: {
        headers: [createHeaderRule()],
        queries: [createQueryRule()]
      }
    });

    expect(sanitized.rules.headers).toHaveLength(1);
    expect(sanitized.rules.queries).toHaveLength(1);
    expect(sanitized.rules.headers[0]).toMatchObject({ enabled: true, name: "", value: "" });
    expect(sanitized.rules.queries[0]).toMatchObject({ enabled: true, key: "", value: "" });
  });

  it("creates workspace items and todos with stable defaults", () => {
    expect(createWorkspaceItem({ type: "text", now: 1 })).toMatchObject({
      type: "text",
      title: "",
      value: "",
      createdAt: 1,
      updatedAt: 1
    });
    expect(createWorkspaceItem({ type: "link", now: 1 })).toMatchObject({
      type: "link",
      title: ""
    });
    expect(createWorkspaceItem({ type: "command", now: 1 })).toMatchObject({
      type: "command",
      title: ""
    });
    expect(createWorkspaceTodo({ now: 1 })).toMatchObject({
      title: "",
      done: false,
      createdAt: 1,
      updatedAt: 1
    });
  });

  it("migrates old states without templates", () => {
    const oldState = {
      enabled: true,
      autoSwitch: true,
      envs: {},
      groupBindings: {},
      ruleMeta: { activeRuleIds: [] }
    };
    const next = sanitizeState(oldState as unknown as ReturnType<typeof createEmptyState>);
    expect(next.templates).toEqual({});
    expect(next.globalWorkspace).toEqual({ items: [] });
  });

  it("sanitizes global workspace snippets without touching env workspaces", () => {
    const env = {
      ...createEnv({ name: "Preview", now: 1 }),
      workspace: {
        items: [createWorkspaceItem({ type: "text", now: 1 })],
        todos: [],
        notes: ""
      }
    };
    const state = {
      ...createEmptyState(1),
      envs: { [env.id]: env },
      globalWorkspace: {
        items: [
          {
            id: "global-1",
            type: "unknown" as never,
          title: "",
            value: " https://example.com ",
            createdAt: 1,
            updatedAt: 1
          }
        ]
      }
    };

    const sanitized = sanitizeState(state);

    expect(sanitized.globalWorkspace).toEqual({
      items: [
        {
          id: "global-1",
          type: "text",
          title: "",
          value: "https://example.com",
          createdAt: 1,
          updatedAt: 1
        }
      ]
    });
    expect(sanitized.envs[env.id].workspace.items).toHaveLength(1);
    expect(sanitizeGlobalWorkspace(state.globalWorkspace)).toEqual(sanitized.globalWorkspace);
  });

  it("migrates old envs without workspace", () => {
    const env = createEnv({ name: "Preview", now: 1 });
    const { workspace: _workspace, ...oldEnv } = env;
    const sanitized = sanitizeEnv(oldEnv as typeof env);
    expect(sanitized.workspace).toEqual({ items: [], todos: [], notes: "" });
  });

  it("sanitizes env workspace without affecting rules", () => {
    const env = createEnv({ name: "Preview", now: 1 });
    const sanitized = sanitizeEnv({
      ...env,
      enabled: true,
      filters: { domains: ["example.com"], paths: [], excludedDomains: [] },
      rules: {
        headers: [createHeaderRule({ name: "x-preview", value: "1" })],
        queries: [createQueryRule()]
      },
      workspace: {
        items: [
          {
            id: "i1",
            type: "text",
            title: " branch ",
            value: " feat/demo ",
            createdAt: 1,
            updatedAt: 1
          },
          {
            id: "i2",
            type: "unknown" as never,
            title: "",
            value: "https://example.com",
            createdAt: 1,
            updatedAt: 1
          }
        ],
        todos: [
          { id: "t1", title: " verify header ", done: true, createdAt: 1, updatedAt: 1 },
          { id: "t2", title: "", done: false, createdAt: 1, updatedAt: 1 }
        ],
        notes: "  remember this env  "
      }
    });

    expect(sanitized.rules.headers).toHaveLength(1);
    expect(sanitized.workspace).toEqual({
      items: [
        {
          id: "i1",
          type: "text",
          title: "branch",
          value: "feat/demo",
          createdAt: 1,
          updatedAt: 1
        },
        {
          id: "i2",
          type: "text",
          title: "",
          value: "https://example.com",
          createdAt: 1,
          updatedAt: 1
        }
      ],
      todos: [
        { id: "t1", title: "verify header", done: true, createdAt: 1, updatedAt: 1 },
        { id: "t2", title: "", done: false, createdAt: 1, updatedAt: 1 }
      ],
      notes: "remember this env"
    });
  });

  it("keeps latest workspace data when saving background rule refresh results", () => {
    const env = createEnv({ name: "Preview", now: 1 });
    const refreshedState = {
      ...createEmptyState(1),
      envs: { [env.id]: env },
      selectedEnvId: env.id
    };
    const todo = createWorkspaceTodo({ now: 2 });
    const latestState = {
      ...refreshedState,
      envs: {
        [env.id]: {
          ...env,
          workspace: { items: [], todos: [todo], notes: "" }
        }
      }
    };

    const merged = mergeRuleRefreshState(latestState, refreshedState, {
      activeRuleIds: [10000],
      lastCompiledAt: 3
    });

    expect(merged.envs[env.id].workspace.todos).toEqual([todo]);
    expect(merged.ruleMeta).toEqual({ activeRuleIds: [10000], lastCompiledAt: 3 });
  });

  it("applies a template as ordinary env filters and header rules", () => {
    const env = createEnv({ name: "Preview", now: 1 });
    const template = {
      ...createEnvTemplate({ name: "Preview", now: 1 }),
      filters: {
        domains: ["example.com"],
        paths: ["/api/*"],
        excludedDomains: ["sso.example.com"]
      },
      headers: [
        createHeaderRule({ id: "fixed", name: "x-preview-enabled", value: "1" }),
        createHeaderRule({
          id: "fillable",
          name: "x-env-name",
          value: "resolved",
          valueSource: { type: "xpath", selector: "//title" }
        }),
        createHeaderRule({ id: "empty", name: "", value: "ignored" })
      ]
    };

    const next = applyTemplateToEnv(env, template, 2);

    expect(next.filters).toEqual(template.filters);
    expect(next.enabled).toBe(true);
    expect(next.rules.headers).toHaveLength(2);
    expect(next.rules.headers.map((rule) => rule.name)).toEqual([
      "x-preview-enabled",
      "x-env-name"
    ]);
    expect(next.rules.headers.map((rule) => rule.value)).toEqual(["1", "resolved"]);
    expect(next.rules.headers.map((rule) => rule.valueSource)).toEqual([undefined, undefined]);
    expect(next.rules.headers.map((rule) => rule.id)).not.toContain("fixed");
  });

  it("parses and formats template value sources", () => {
    expect(parseTemplateValueSourceInput("xpath://meta[@name='env']/@content")).toEqual({
      type: "xpath",
      selector: "//meta[@name='env']/@content"
    });
    expect(parseTemplateValueSourceInput("//input[@name='env']/@value")).toEqual({
      type: "xpath",
      selector: "//input[@name='env']/@value"
    });
    expect(parseTemplateValueSourceInput("//*[@data-env='preview']")).toEqual({
      type: "xpath",
      selector: "//*[@data-env='preview']"
    });
    expect(parseTemplateValueSourceInput("css:#env@value")).toEqual({
      type: "css",
      selector: "#env",
      attribute: "value"
    });
    expect(formatTemplateValueSourceInput({ type: "css", selector: "#env", attribute: "value" })).toBe(
      "css:#env@value"
    );
  });

  it("sanitizes template value sources but removes them from env rules", () => {
    const template = sanitizeEnvTemplate({
      ...createEnvTemplate({ name: "Preview", now: 1 }),
      headers: [
        createHeaderRule({
          name: " x-env-name ",
          value: " fallback ",
          valueSource: { type: "xpath", selector: " //title " }
        }),
        createHeaderRule({
          name: "x-invalid",
          value: "fallback",
          valueSource: { type: "css", selector: "" }
        })
      ]
    });

    expect(template.headers[0]).toMatchObject({
      name: "x-env-name",
      value: "fallback",
      valueSource: { type: "xpath", selector: "//title" }
    });
    expect(template.headers[1].valueSource).toBeUndefined();

    const env = sanitizeEnv({
      ...createEnv({ name: "Preview", now: 1 }),
      enabled: true,
      filters: { domains: ["example.com"], paths: [], excludedDomains: [] },
      rules: { headers: template.headers, queries: [] }
    });
    expect(env.rules.headers[0].valueSource).toBeUndefined();
  });

  it("detects envs that can show template choices", () => {
    const empty = createEnv({ name: "Empty", now: 1 });
    const withHeader = {
      ...empty,
      rules: { ...empty.rules, headers: [createHeaderRule({ name: "x-preview-enabled" })] }
    };
    expect(isEnvEmptyForTemplate(empty)).toBe(true);
    expect(isEnvEmptyForTemplate(withHeader)).toBe(false);
  });

  it("duplicates env without group bindings", () => {
    const env = createEnv({
      name: "Checkout",
      hostname: "pre.example.com",
      groupKey: "chrome:1:2",
      now: 1
    });
    const copy = duplicateEnv(env, 2);
    expect(copy.id).not.toBe(env.id);
    expect(copy.name).toBe("Checkout 副本");
    expect(copy.scope).toBe(env.scope);
    expect(copy.linkedGroupKeys).toEqual([]);
    expect(copy.filters).toEqual(env.filters);
    expect(copy.rules).toEqual(env.rules);
  });

  it("restores a stale group binding by a unique matching title", () => {
    const env = {
      ...createEnv({ name: "Preview", now: 1 }),
      linkedGroupKeys: ["chrome:1:2"]
    };
    const state = {
      ...createEmptyState(1),
      selectedEnvId: env.id,
      envs: { [env.id]: env },
      groupBindings: {
        "chrome:1:2": {
          groupKey: "chrome:1:2",
          envId: env.id,
          chromeGroupId: 2,
          windowId: 1,
          title: "Preview",
          color: "blue",
          lastSeenTabUrls: [],
          updatedAt: 1
        }
      }
    };

    const next = reconcileGroupBindings(
      state,
      [
        { groupKey: "chrome:1:2", groupId: 2, windowId: 1, title: "Other", color: "red" },
        { groupKey: "chrome:1:9", groupId: 9, windowId: 1, title: "Preview", color: "green" }
      ],
      2
    );

    expect(next.groupBindings["chrome:1:2"]).toBeUndefined();
    expect(next.groupBindings["chrome:1:9"]).toMatchObject({
      groupKey: "chrome:1:9",
      envId: env.id,
      chromeGroupId: 9,
      windowId: 1,
      title: "Preview",
      color: "green",
      unresolved: false,
      updatedAt: 2
    });
    expect(next.envs[env.id].linkedGroupKeys).toEqual(["chrome:1:9"]);
  });

  it("keeps a stale group binding unresolved when title matching is ambiguous", () => {
    const env = {
      ...createEnv({ name: "Preview", now: 1 }),
      linkedGroupKeys: ["chrome:1:2"]
    };
    const state = {
      ...createEmptyState(1),
      selectedEnvId: env.id,
      envs: { [env.id]: env },
      groupBindings: {
        "chrome:1:2": {
          groupKey: "chrome:1:2",
          envId: env.id,
          chromeGroupId: 2,
          windowId: 1,
          title: "Preview",
          color: "blue",
          lastSeenTabUrls: [],
          updatedAt: 1
        }
      }
    };

    const next = reconcileGroupBindings(
      state,
      [
        { groupKey: "chrome:1:8", groupId: 8, windowId: 1, title: "Preview", color: "red" },
        { groupKey: "chrome:1:9", groupId: 9, windowId: 1, title: "Preview", color: "green" }
      ],
      2
    );

    expect(next.groupBindings["chrome:1:2"]).toMatchObject({
      groupKey: "chrome:1:2",
      envId: env.id,
      chromeGroupId: 2,
      unresolved: true,
      updatedAt: 2
    });
    expect(next.envs[env.id].linkedGroupKeys).toEqual(["chrome:1:2"]);
  });
});
