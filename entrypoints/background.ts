import { updateActionIcon } from "../src/extension/action-icon";
import { getActiveContext, resolveTabsByGroup } from "../src/extension/chrome-api";
import { loadState, saveState } from "../src/extension/storage";
import { compileSessionRules } from "../src/model/dnr";

let refreshing = false;

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    void refreshSessionRules();
  });

  chrome.runtime.onStartup.addListener(() => {
    void refreshSessionRules();
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "browser-group-env.refresh-rules") {
      return false;
    }
    void refreshSessionRules()
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.browserGroupEnvState) {
      if (refreshing) {
        return;
      }
      void refreshSessionRules();
    }
  });

  chrome.tabs.onCreated.addListener(() => void refreshSessionRules());
  chrome.tabs.onRemoved.addListener(() => void refreshSessionRules());
  chrome.tabs.onUpdated.addListener(() => void refreshSessionRules());
  chrome.tabs.onActivated.addListener(() => void refreshSessionRules());
  chrome.tabs.onMoved.addListener(() => void refreshSessionRules());
  chrome.tabGroups.onCreated.addListener(() => void refreshSessionRules());
  chrome.tabGroups.onRemoved.addListener(() => void refreshSessionRules());
  chrome.tabGroups.onUpdated.addListener(() => void refreshSessionRules());
  chrome.windows.onFocusChanged.addListener(() => void refreshSessionRules());
});

async function refreshSessionRules() {
  if (refreshing) {
    return;
  }
  refreshing = true;
  try {
    const state = await loadState();
    const [context, tabsByGroup] = await Promise.all([
      getActiveContext(),
      resolveTabsByGroup(state.groupBindings)
    ]);
    const rules = compileSessionRules(state, tabsByGroup);
    const oldRuleIds = state.ruleMeta.activeRuleIds;
    const newRuleIds = rules.map((rule) => rule.id);

    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: oldRuleIds,
      addRules: rules
    });

    await updateActionIcon(state, context);

    await saveState({
      ...state,
      ruleMeta: {
        activeRuleIds: newRuleIds,
        lastCompiledAt: Date.now()
      }
    });
  } finally {
    refreshing = false;
  }
}
