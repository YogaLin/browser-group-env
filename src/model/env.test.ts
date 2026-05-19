import { describe, expect, it } from "vitest";
import {
  applyTemplateToEnv,
  createEmptyState,
  createEnv,
  createEnvTemplate,
  createHeaderRule,
  createQueryRule,
  duplicateEnv,
  formatTemplateValueSourceInput,
  isEnvEmptyForTemplate,
  parseTemplateValueSourceInput,
  sanitizeEnv,
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
  });

  it("creates env without default domain filter", () => {
    const env = createEnv({ name: "Checkout", hostname: "pre.example.com", now: 1 });
    expect(env.enabled).toBe(false);
    expect(env.scope).toBe("group");
    expect(env.filters.domains).toEqual([]);
    expect(env.rules.headers).toEqual([]);
  });

  it("creates env without hostname as disabled and without filters", () => {
    const env = createEnv({ name: "No Url", now: 1 });
    expect(env.enabled).toBe(false);
    expect(env.filters.domains).toEqual([]);
  });

  it("creates disabled env without hostname", () => {
    const env = createEnv({ name: "No Host", now: 1 });
    expect(env.enabled).toBe(false);
    expect(env.filters.domains).toEqual([]);
  });

  it("keeps env disabled when domain filter is empty", () => {
    const env = createEnv({ name: "Checkout", hostname: "pre.example.com", now: 1 });
    const sanitized = sanitizeEnv({
      ...env,
      enabled: true,
      filters: { ...env.filters, domains: [] }
    });
    expect(sanitized.enabled).toBe(false);
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
});
