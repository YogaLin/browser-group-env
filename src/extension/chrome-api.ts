import {
  createGroupKey,
  type ActiveContext,
  type AvailableTabGroup,
  type EnvTemplate,
  type GroupBinding,
  type TemplateValueSource
} from "../model/env";

export async function getActiveContext(): Promise<ActiveContext> {
  if (!hasChromeTabs()) {
    const url = window.location.href;
    return {
      tabId: 1,
      windowId: 1,
      groupId: 1,
      groupKey: createGroupKey(1, 1),
      groupTitle: "Preview Group",
      groupColor: "purple",
      availableGroups: [
        {
          groupKey: createGroupKey(1, 1),
          groupId: 1,
          windowId: 1,
          title: "Preview Group",
          color: "purple"
        },
        {
          groupKey: createGroupKey(1, 2),
          groupId: 2,
          windowId: 1,
          title: "Another Group",
          color: "green"
        }
      ],
      url,
      hostname: new URL(url).hostname
    };
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    return {};
  }

  const availableGroups = await getAvailableGroups();
  const context: ActiveContext = {
    tabId: tab.id,
    windowId: tab.windowId,
    groupId: tab.groupId,
    availableGroups,
    url: tab.url,
    hostname: safeHostname(tab.url)
  };

  if (tab.groupId !== undefined && tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
    const group =
      availableGroups.find(
        (candidate) => candidate.groupId === tab.groupId && candidate.windowId === tab.windowId
      ) ?? (await getGroupInfo(tab.groupId));
    context.groupKey = createGroupKey(tab.windowId, tab.groupId);
    context.groupTitle = group.title || `标签组 ${tab.groupId}`;
    context.groupColor = group.color;
  }

  return context;
}

export async function createBindingForCurrentGroup(envId: string): Promise<GroupBinding | undefined> {
  const context = await getActiveContext();
  const currentGroup = context.availableGroups?.find(
    (group) => group.groupKey === context.groupKey
  );
  if (!currentGroup) {
    return undefined;
  }
  return createBindingForGroup(envId, currentGroup);
}

export async function createBindingForGroup(
  envId: string,
  group: AvailableTabGroup
): Promise<GroupBinding> {
  const tabs = await getTabsForGroup(group.groupId, group.windowId);
  return {
    groupKey: group.groupKey,
    envId,
    chromeGroupId: group.groupId,
    windowId: group.windowId,
    title: group.title,
    color: group.color,
    lastSeenTabUrls: tabs.map((tab) => tab.url).filter(Boolean) as string[],
    updatedAt: Date.now()
  };
}

export async function resolveTabsByGroup(bindings: Record<string, GroupBinding>) {
  const result: Record<string, number[]> = {};
  if (!hasChromeTabs()) {
    for (const groupKey of Object.keys(bindings)) {
      result[groupKey] = [1];
    }
    return result;
  }

  for (const binding of Object.values(bindings)) {
    if (binding.chromeGroupId === undefined || binding.windowId === undefined || binding.unresolved) {
      result[binding.groupKey] = [];
      continue;
    }
    const tabs = await getTabsForGroup(binding.chromeGroupId, binding.windowId);
    result[binding.groupKey] = tabs.map((tab) => tab.id).filter((id): id is number => id !== undefined);
  }
  return result;
}

export async function refreshRules(): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
    return;
  }
  try {
    await chrome.runtime.sendMessage({ type: "browser-group-env.refresh-rules" });
  } catch {
    // Popup preview 或 service worker 未就绪时忽略，下一次 storage/tabs 事件会刷新。
  }
}

export async function openTemplateManagerPage(): Promise<void> {
  const search = new URLSearchParams({ templates: "1" });
  const sourceTabId = await getActiveTabId();
  if (sourceTabId !== undefined) {
    search.set("sourceTabId", String(sourceTabId));
  }
  const path = `options.html?${search.toString()}`;
  if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
    const url = chrome.runtime.getURL(path);
    if (chrome.tabs?.create) {
      await chrome.tabs.create({ url });
      return;
    }
    window.open(url, "_blank", "noopener");
    return;
  }
  window.open(`/${path}`, "_blank", "noopener");
}

export async function openSidePanel(): Promise<void> {
  if (typeof chrome === "undefined") {
    window.open("/sidepanel.html", "_blank", "noopener");
    return;
  }

  if (chrome.sidePanel?.open) {
    const [tab] = chrome.tabs?.query
      ? await chrome.tabs.query({ active: true, currentWindow: true })
      : [];
    await chrome.sidePanel.open({ windowId: tab?.windowId });
    return;
  }

  const url = chrome.runtime?.getURL ? chrome.runtime.getURL("sidepanel.html") : "/sidepanel.html";
  if (chrome.tabs?.create) {
    await chrome.tabs.create({ url });
    return;
  }
  window.open(url, "_blank", "noopener");
}

export async function resolveTemplateDynamicValues(
  template: EnvTemplate,
  sourceTabId?: number
): Promise<EnvTemplate> {
  const sourceRules = template.headers
    .map((rule, index) => ({ index, source: rule.valueSource }))
    .filter((entry): entry is { index: number; source: TemplateValueSource } =>
      Boolean(entry.source)
    );

  if (!sourceRules.length || typeof chrome === "undefined" || !chrome.scripting?.executeScript) {
    return template;
  }

  const tabId = sourceTabId ?? (await getActiveTabId());
  if (tabId === undefined) {
    return template;
  }

  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: readTemplateValuesFromPage,
      args: [sourceRules.map((entry) => entry.source)]
    });
    const values = result?.result ?? [];
    return {
      ...template,
      headers: template.headers.map((rule, index) => {
        const sourceIndex = sourceRules.findIndex((entry) => entry.index === index);
        const value = sourceIndex >= 0 ? values[sourceIndex] : undefined;
        return value ? { ...rule, value } : rule;
      })
    };
  } catch {
    return template;
  }
}

function hasChromeTabs(): boolean {
  return typeof chrome !== "undefined" && Boolean(chrome.tabs && chrome.tabGroups);
}

async function getActiveTabId(): Promise<number | undefined> {
  if (!hasChromeTabs()) {
    return 1;
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

async function getTabsForGroup(groupId: number, windowId: number): Promise<chrome.tabs.Tab[]> {
  if (!hasChromeTabs()) {
    return [];
  }
  return chrome.tabs.query({ groupId, windowId });
}

async function getAvailableGroups(): Promise<AvailableTabGroup[]> {
  if (!hasChromeTabs()) {
    return [];
  }
  const groups = await chrome.tabGroups.query({});
  return groups.map((group) => ({
    groupKey: createGroupKey(group.windowId, group.id),
    groupId: group.id,
    windowId: group.windowId,
    title: group.title || `标签组 ${group.id}`,
    color: group.color
  }));
}

async function getGroupInfo(groupId: number): Promise<AvailableTabGroup> {
  const group = await chrome.tabGroups.get(groupId);
  return {
    groupKey: createGroupKey(group.windowId, group.id),
    groupId: group.id,
    windowId: group.windowId,
    title: group.title || `标签组 ${group.id}`,
    color: group.color
  };
}

function safeHostname(url?: string): string | undefined {
  if (!url) {
    return undefined;
  }
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

function readTemplateValuesFromPage(
  sources: Array<{ type: "xpath" | "css"; selector: string; attribute?: string }>
): Array<string | undefined> {
  const normalize = (value: unknown): string | undefined => {
    if (value === null || value === undefined) {
      return undefined;
    }
    const text = String(value).trim();
    return text || undefined;
  };

  const readNodeValue = (node: Node | null, attribute?: string): string | undefined => {
    if (!node) {
      return undefined;
    }
    if (attribute && node instanceof Element) {
      return normalize(node.getAttribute(attribute));
    }
    if (node.nodeType === Node.ATTRIBUTE_NODE) {
      return normalize((node as Attr).value);
    }
    if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
      return normalize(node.value);
    }
    if (node instanceof HTMLSelectElement) {
      return normalize(node.value);
    }
    return normalize(node.textContent);
  };

  const readCss = (selector: string, attribute?: string): string | undefined => {
    try {
      return readNodeValue(document.querySelector(selector), attribute);
    } catch {
      return undefined;
    }
  };

  const readXpath = (selector: string): string | undefined => {
    try {
      const result = document.evaluate(selector, document, null, XPathResult.ANY_TYPE, null);
      if (result.resultType === XPathResult.STRING_TYPE) {
        return normalize(result.stringValue);
      }
      if (result.resultType === XPathResult.NUMBER_TYPE) {
        return normalize(result.numberValue);
      }
      if (result.resultType === XPathResult.BOOLEAN_TYPE) {
        return normalize(result.booleanValue);
      }
      return readNodeValue(result.iterateNext());
    } catch {
      return undefined;
    }
  };

  return sources.map((source) =>
    source.type === "css" ? readCss(source.selector, source.attribute) : readXpath(source.selector)
  );
}
