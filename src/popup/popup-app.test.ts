import { describe, expect, it } from "vitest";
import { createEnv, createGroupKey, createWorkspaceItem, createWorkspaceTodo, type GlobalState } from "../model/env";
import {
  appendListValue,
  deleteEnv,
  getEnvDetailTabs,
  getEnvDetailContentClassName,
  getInitialEnvDetailTab,
  getHeaderControlsClassName,
  getInputClearButtonClassName,
  getWorkspaceItemActionButtonClassName,
  getWorkspaceItemCopyLabel,
  getWorkspaceItemDragHandleClassName,
  getWorkspaceItemRowClassName,
  getWorkspaceItemAddTypes,
  getWorkspaceItemActions,
  shouldCloseDropdownOnDocumentClick,
  shouldCommitTextInputChange,
  isEnvSettingsTab,
  isWorkspaceValueLink,
  readEnvDetailTab,
  reorderEnvs,
  reorderWorkspaceItems,
  reorderWorkspaceTodos,
  selectEnvManually,
  updateGlobalWorkspaceItem,
  updateWorkspaceItem,
  updateWorkspaceTodo,
  writeEnvDetailTab
} from "./popup-app";

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
      globalWorkspace: { items: [] },
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
      globalWorkspace: { items: [] },
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
      globalWorkspace: { items: [] },
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

  it("updates workspace items without changing env order or rules", () => {
    const item = createWorkspaceItem({ type: "text", now: 1 });
    const envA = createEnv({ name: "A", hostname: "a.example.com", now: 1 });
    const envB = {
      ...createEnv({ name: "B", hostname: "b.example.com", now: 2 }),
      workspace: { items: [item], todos: [], notes: "" }
    };
    const state: GlobalState = {
      enabled: true,
      autoSwitch: false,
      selectedEnvId: envB.id,
      envs: { [envA.id]: envA, [envB.id]: envB },
      templates: {},
      globalWorkspace: { items: [] },
      groupBindings: {},
      ruleMeta: { activeRuleIds: [] }
    };

    const next = updateWorkspaceItem(state, envB.id, item.id, { title: "branch", value: "feat/demo" }, 3);

    expect(Object.keys(next.envs)).toEqual([envA.id, envB.id]);
    expect(next.envs[envB.id].rules).toBe(envB.rules);
    expect(next.envs[envB.id].workspace.items[0]).toMatchObject({
      id: item.id,
      title: "branch",
      value: "feat/demo",
      updatedAt: 3
    });
  });

  it("updates global workspace items without changing env workspace", () => {
    const globalItem = createWorkspaceItem({ type: "text", now: 1 });
    const envItem = createWorkspaceItem({ type: "text", now: 2 });
    const env = {
      ...createEnv({ name: "A", hostname: "a.example.com", now: 1 }),
      workspace: { items: [envItem], todos: [], notes: "" }
    };
    const state: GlobalState = {
      enabled: true,
      autoSwitch: false,
      selectedEnvId: env.id,
      envs: { [env.id]: env },
      templates: {},
      globalWorkspace: { items: [globalItem] },
      groupBindings: {},
      ruleMeta: { activeRuleIds: [] }
    };

    const next = updateGlobalWorkspaceItem(state, globalItem.id, { value: "shared-token" }, 3);

    expect(next.globalWorkspace.items[0]).toMatchObject({
      id: globalItem.id,
      value: "shared-token",
      updatedAt: 3
    });
    expect(next.envs[env.id].workspace.items).toEqual([envItem]);
  });

  it("reorders workspace items and todos independently", () => {
    const itemA = createWorkspaceItem({ type: "text", now: 1 });
    const itemB = createWorkspaceItem({ type: "link", now: 2 });
    const todoA = createWorkspaceTodo({ now: 1 });
    const todoB = createWorkspaceTodo({ now: 2 });
    const env = {
      ...createEnv({ name: "A", hostname: "a.example.com", now: 1 }),
      workspace: { items: [itemA, itemB], todos: [todoA, todoB], notes: "" }
    };
    const state: GlobalState = {
      enabled: true,
      autoSwitch: false,
      selectedEnvId: env.id,
      envs: { [env.id]: env },
      templates: {},
      globalWorkspace: { items: [] },
      groupBindings: {},
      ruleMeta: { activeRuleIds: [] }
    };

    const itemsReordered = reorderWorkspaceItems(state, env.id, itemB.id, itemA.id);
    const todosReordered = reorderWorkspaceTodos(state, env.id, todoB.id, todoA.id);

    expect(itemsReordered.envs[env.id].workspace.items.map((current) => current.id)).toEqual([
      itemB.id,
      itemA.id
    ]);
    expect(todosReordered.envs[env.id].workspace.todos.map((current) => current.id)).toEqual([
      todoB.id,
      todoA.id
    ]);
  });

  it("toggles workspace todo without changing selected env", () => {
    const todo = createWorkspaceTodo({ now: 1 });
    const env = {
      ...createEnv({ name: "A", hostname: "a.example.com", now: 1 }),
      workspace: { items: [], todos: [todo], notes: "" }
    };
    const state: GlobalState = {
      enabled: true,
      autoSwitch: false,
      selectedEnvId: env.id,
      envs: { [env.id]: env },
      templates: {},
      globalWorkspace: { items: [] },
      groupBindings: {},
      ruleMeta: { activeRuleIds: [] }
    };

    const next = updateWorkspaceTodo(state, env.id, todo.id, { done: true }, 2);

    expect(next.selectedEnvId).toBe(env.id);
    expect(next.envs[env.id].workspace.todos[0]).toMatchObject({ done: true, updatedAt: 2 });
  });

  it("defaults env detail to rules and filters tab and rejects unknown tabs", () => {
    expect(getInitialEnvDetailTab()).toBe("rules");
    expect(getInitialEnvDetailTab("rules")).toBe("rules");
    expect(getInitialEnvDetailTab("workspace")).toBe("workspace");
    expect(getInitialEnvDetailTab("diagnostics")).toBe("rules");
  });

  it("restores workspace when it was the previously selected env detail tab", () => {
    expect(getInitialEnvDetailTab("workspace")).toBe("workspace");
  });

  it("persists the selected env detail tab between popup opens", () => {
    const values: Record<string, string> = {};
    const storage = {
      getItem: (key: string) => values[key] ?? null,
      setItem: (key: string, value: string) => {
        values[key] = value;
      }
    } as Storage;

    writeEnvDetailTab("workspace", storage);

    expect(readEnvDetailTab(storage)).toBe("workspace");
    expect(getInitialEnvDetailTab(readEnvDetailTab(storage))).toBe("workspace");
  });

  it("renders rules and filters before workspace in env detail tabs", () => {
    expect(getEnvDetailTabs()).toEqual(["rules", "workspace"]);
  });

  it("keeps spacing between detail tabs and the first content card", () => {
    expect(getEnvDetailContentClassName().split(/\s+/)).toContain("pt-3");
  });

  it("keeps env settings inside the rules and filters tab", () => {
    expect(isEnvSettingsTab("rules")).toBe(true);
    expect(isEnvSettingsTab("workspace")).toBe(false);
  });

  it("detects workspace item values that can be opened as links", () => {
    expect(isWorkspaceValueLink("https://example.com/path")).toBe(true);
    expect(isWorkspaceValueLink("example.com/path")).toBe(true);
    expect(isWorkspaceValueLink("localhost:3000/debug")).toBe(true);
    expect(isWorkspaceValueLink("npm run test")).toBe(false);
    expect(isWorkspaceValueLink("feature/demo")).toBe(false);
  });

  it("uses one workspace item add entry instead of text link command choices", () => {
    expect(getWorkspaceItemAddTypes()).toEqual(["text"]);
  });

  it("uses compact draggable rows for workspace snippets", () => {
    expect(getWorkspaceItemRowClassName(false).split(/\s+/)).toContain("grid");
    expect(getWorkspaceItemRowClassName(true).split(/\s+/)).toContain("opacity-45");

    const dragHandleClassNames = getWorkspaceItemDragHandleClassName().split(/\s+/);
    expect(dragHandleClassNames).toContain("opacity-0");
    expect(dragHandleClassNames).toContain("group-hover:opacity-100");
    expect(dragHandleClassNames).toContain("group-focus-within:opacity-100");
  });

  it("shows copy for every workspace item and open only for link-like values", () => {
    expect(getWorkspaceItemActions("npm run test")).toEqual(["copy"]);
    expect(getWorkspaceItemActions("example.com/debug")).toEqual(["copy", "open"]);
  });

  it("uses bordered hover styling and copied feedback for workspace copy buttons", () => {
    const classNames = getWorkspaceItemActionButtonClassName("copy", false).split(/\s+/);

    expect(classNames).toContain("border");
    expect(classNames).toContain("border-transparent");
    expect(classNames).toContain("hover:border-notion-hairline");
    expect(getWorkspaceItemCopyLabel(false, "Copy", "Copied")).toBe("Copy");
    expect(getWorkspaceItemCopyLabel(true, "Copy", "Copied")).toBe("Copied");
  });

  it("keeps popup header controls on one line because status text truncates first", () => {
    const classNames = getHeaderControlsClassName().split(/\s+/);

    expect(classNames).toContain("flex-nowrap");
    expect(classNames).toContain("min-w-0");
  });

  it("shows input clear buttons only when the input area is hovered or focused", () => {
    const className = getInputClearButtonClassName(true);

    expect(className).toContain("opacity-0");
    expect(className).toContain("group-hover:opacity-100");
    expect(className).toContain("group-focus-within:opacity-100");
  });

  it("defers text input commits while IME composition is active", () => {
    expect(shouldCommitTextInputChange(false)).toBe(true);
    expect(shouldCommitTextInputChange(true)).toBe(false);
  });

  it("closes custom dropdowns only when clicking outside while open", () => {
    expect(shouldCloseDropdownOnDocumentClick({ open: true, targetInside: false })).toBe(true);
    expect(shouldCloseDropdownOnDocumentClick({ open: true, targetInside: true })).toBe(false);
    expect(shouldCloseDropdownOnDocumentClick({ open: false, targetInside: false })).toBe(false);
  });
});
