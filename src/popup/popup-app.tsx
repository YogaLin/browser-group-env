import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Boxes,
  ChevronDown,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  GripVertical,
  Languages,
  Link2,
  PanelRightOpen,
  Pause,
  Plus,
  Power,
  RefreshCw,
  Search,
  StickyNote,
  Trash2,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createBindingForCurrentGroup,
  createBindingForGroup,
  getActiveContext,
  openTemplateManagerPage,
  openSidePanel,
  refreshRules,
  resolveTemplateDynamicValues
} from "../extension/chrome-api";
import { loadState, onStateChanged, saveState } from "../extension/storage";
import {
  createEnv,
  createEnvTemplate,
  createHeaderRule,
  createQueryRule,
  createWorkspaceItem,
  createWorkspaceTodo,
  duplicateEnv,
  applyTemplateToEnv,
  formatTemplateValueSourceInput,
  isEnvEmptyForTemplate,
  parseTemplateValueSourceInput,
  reconcileGroupBindings,
  sanitizeEnv,
  sanitizeEnvTemplate,
  type ActiveContext,
  type AvailableTabGroup,
  type Env,
  type EnvTemplate,
  type GlobalWorkspace,
  type GroupBinding,
  type GlobalState,
  type HeaderRule,
  type MatchDiagnostics,
  type WorkspaceItem,
  type WorkspaceTodo
} from "../model/env";
import { getDiagnostics } from "../model/diagnostics";
import { ICON_LAYER_COLOR, getGroupColorHex } from "../model/group-color";

type Language = "zh" | "en";
type MessageKey =
  | "activeTitle"
  | "pausedTitle"
  | "envTab"
  | "auto"
  | "manual"
  | "switchLanguage"
  | "templates"
  | "openPanel"
  | "templateManagerTitle"
  | "newTemplate"
  | "templateName"
  | "saveTemplate"
  | "savingTemplate"
  | "templateSaved"
  | "templateSaveFailed"
  | "close"
  | "noTemplates"
  | "chooseTemplate"
  | "chooseTemplateDescription"
  | "applyTemplate"
  | "templateAppliedHint"
  | "dragEnv"
  | "noEnvConfig"
  | "searchPlaceholder"
  | "emptyEnvList"
  | "global"
  | "groups"
  | "unresolved"
  | "createEnv"
  | "deleteActiveConfirm"
  | "deleteConfirm"
  | "confirmDeleteTitle"
  | "confirmManualSwitchTitle"
  | "manualSwitchConfirm"
  | "switchToManual"
  | "cancel"
  | "alwaysOn"
  | "copy"
  | "delete"
  | "noDomainDisabled"
  | "emptyEnvTitle"
  | "emptyEnvDescription"
  | "groupsTitle"
  | "globalNoGroup"
  | "groupUnavailable"
  | "unbind"
  | "bind"
  | "currentGroupHint"
  | "restorePending"
  | "noAvailableGroups"
  | "envSettings"
  | "workspaceTab"
  | "rulesTab"
  | "filters"
  | "workspace"
  | "items"
  | "globalItems"
  | "envItems"
  | "addItem"
  | "addTodo"
  | "todos"
  | "notes"
  | "title"
  | "snippetNamePlaceholder"
  | "itemValuePlaceholder"
  | "todoPlaceholder"
  | "notesPlaceholder"
  | "emptyWorkspaceItems"
  | "emptyTodos"
  | "copyValue"
  | "copiedValue"
  | "openLink"
  | "moveUp"
  | "moveDown"
  | "domains"
  | "paths"
  | "excludedDomains"
  | "useCurrentDomain"
  | "rules"
  | "addHeader"
  | "addQuery"
  | "emptyRules"
  | "headers"
  | "queryReplace"
  | "name"
  | "key"
  | "value"
  | "headerNamePlaceholder"
  | "headerValuePlaceholder"
  | "templateValueSource"
  | "templateValueSourcePlaceholder"
  | "queryKeyPlaceholder"
  | "queryValuePlaceholder"
  | "tabGroup"
  | "matched"
  | "paused"
  | "newEnv";

const MESSAGES: Record<Language, Record<MessageKey, string>> = {
  zh: {
    activeTitle: "已启用",
    pausedTitle: "已暂停",
    envTab: "环境",
    auto: "自动",
    manual: "手动",
    switchLanguage: "Switch to English",
    templates: "模板管理",
    openPanel: "打开面板",
    templateManagerTitle: "配置模板",
    newTemplate: "新建模板",
    templateName: "模板名称",
    saveTemplate: "保存模板",
    savingTemplate: "保存中...",
    templateSaved: "已保存",
    templateSaveFailed: "保存失败",
    close: "关闭",
    noTemplates: "暂无模板",
    chooseTemplate: "选择模板",
    chooseTemplateDescription: "当前环境还没有过滤条件和规则，可以从模板快速生成。",
    applyTemplate: "应用",
    templateAppliedHint: "应用后会生成普通过滤条件和请求头规则，可继续编辑。",
    dragEnv: "拖动排序",
    noEnvConfig: "暂无环境配置",
    searchPlaceholder: "搜索环境/配置",
    emptyEnvList: "暂无环境",
    global: "全局",
    groups: "个标签组",
    unresolved: "待恢复",
    createEnv: "新建环境",
    deleteActiveConfirm: "当前环境绑定了正在使用的标签组。删除后该组将不再注入规则，确认删除？",
    deleteConfirm: "确认删除当前环境？",
    confirmDeleteTitle: "删除环境",
    confirmManualSwitchTitle: "切换为手动模式",
    manualSwitchConfirm: "当前处于自动模式。手动切换环境会关闭自动模式，并改为手动模式。",
    switchToManual: "切换",
    cancel: "取消",
    alwaysOn: "始终生效",
    copy: "复制",
    delete: "删除",
    noDomainDisabled: "没有域名过滤条件的环境不允许启用",
    emptyEnvTitle: "还没有环境",
    emptyEnvDescription: "新建后可绑定当前标签组，并手动配置过滤条件或应用模板。",
    groupsTitle: "标签组",
    globalNoGroup: "全局生效，不依赖标签组",
    groupUnavailable: "该标签组暂不可用",
    unbind: "点击取消绑定",
    bind: "点击绑定",
    currentGroupHint: "当前标签组",
    restorePending: "待恢复",
    noAvailableGroups: "当前没有可用标签组",
    envSettings: "环境设置",
    workspaceTab: "工作区",
    rulesTab: "规则 / 过滤",
    filters: "过滤条件",
    workspace: "工作区",
    items: "片段",
    globalItems: "全局片段",
    envItems: "环境片段",
    addItem: "+ 片段",
    addTodo: "+ 待办",
    todos: "待办",
    notes: "备注",
    title: "标题",
    snippetNamePlaceholder: "片段名称（可选）",
    itemValuePlaceholder: "输入要复制或打开的内容",
    todoPlaceholder: "例如验证请求头命中",
    notesPlaceholder: "记录当前环境的上下文、注意事项或临时说明",
    emptyWorkspaceItems: "暂无片段，添加后可快速复制；检测到链接时可直接打开。",
    emptyTodos: "暂无待办。",
    copyValue: "复制",
    copiedValue: "已复制",
    openLink: "打开",
    moveUp: "上移",
    moveDown: "下移",
    domains: "域名",
    paths: "路径",
    excludedDomains: "排除域名",
    useCurrentDomain: "当前域名",
    rules: "规则",
    addHeader: "+ 请求头",
    addQuery: "+ 查询参数",
    emptyRules: "暂无规则，添加请求头或查询参数后会在这里编辑。",
    headers: "请求头",
    queryReplace: "查询参数替换",
    name: "名称",
    key: "参数",
    value: "值",
    headerNamePlaceholder: "例如 x-env-name",
    headerValuePlaceholder: "例如 feature_branch",
    templateValueSource: "自动取值",
    templateValueSourcePlaceholder: "xpath://meta[@name='env']/@content 或 css:#env",
    queryKeyPlaceholder: "例如 env",
    queryValuePlaceholder: "例如 feature_branch",
    tabGroup: "标签组",
    matched: "已命中",
    paused: "已暂停",
    newEnv: "新环境"
  },
  en: {
    activeTitle: "Active",
    pausedTitle: "Paused",
    envTab: "Envs",
    auto: "Auto",
    manual: "Manual",
    switchLanguage: "切换到中文",
    templates: "Templates",
    openPanel: "Open Panel",
    templateManagerTitle: "Config Templates",
    newTemplate: "New Template",
    templateName: "Template Name",
    saveTemplate: "Save Template",
    savingTemplate: "Saving...",
    templateSaved: "Saved",
    templateSaveFailed: "Save failed",
    close: "Close",
    noTemplates: "No templates",
    chooseTemplate: "Choose Template",
    chooseTemplateDescription: "This env has no filters or rules yet. Apply a template to get started.",
    applyTemplate: "Apply",
    templateAppliedHint: "Applying creates ordinary filters and header rules that remain editable.",
    dragEnv: "Drag to reorder",
    noEnvConfig: "No env",
    searchPlaceholder: "Search envs/configs",
    emptyEnvList: "No envs",
    global: "Global",
    groups: "groups",
    unresolved: "pending restore",
    createEnv: "New Env",
    deleteActiveConfirm: "This env is bound to the active tab group. Deleting it will stop rule injection for that group. Continue?",
    deleteConfirm: "Delete this env?",
    confirmDeleteTitle: "Delete Env",
    confirmManualSwitchTitle: "Switch to Manual",
    manualSwitchConfirm: "Auto mode is active. Manually switching envs will turn Auto off and use Manual mode.",
    switchToManual: "Switch",
    cancel: "Cancel",
    alwaysOn: "Always on",
    copy: "Copy",
    delete: "Delete",
    noDomainDisabled: "Envs without domain filters cannot be enabled",
    emptyEnvTitle: "No envs yet",
    emptyEnvDescription: "New envs can bind to the current tab group, then use manual filters or templates.",
    groupsTitle: "Tab Groups",
    globalNoGroup: "Always on, independent of tab groups",
    groupUnavailable: "This tab group is unavailable",
    unbind: "Click to unbind",
    bind: "Click to bind",
    currentGroupHint: "Current tab group",
    restorePending: "pending restore",
    noAvailableGroups: "No available tab groups",
    envSettings: "Env Settings",
    workspaceTab: "Workspace",
    rulesTab: "Rules / Filters",
    filters: "Filters",
    workspace: "Workspace",
    items: "Snippets",
    globalItems: "Global Snippets",
    envItems: "Env Snippets",
    addItem: "+ Item",
    addTodo: "+ Todos",
    todos: "Todos",
    notes: "Notes",
    title: "Title",
    snippetNamePlaceholder: "Snippet name (optional)",
    itemValuePlaceholder: "Text to copy or URL to open",
    todoPlaceholder: "e.g. verify header hit",
    notesPlaceholder: "Context, caveats, or temporary notes for this env",
    emptyWorkspaceItems: "No snippets yet. Add a value to copy it, or open it when it looks like a link.",
    emptyTodos: "No todos yet.",
    copyValue: "Copy",
    copiedValue: "Copied",
    openLink: "Open",
    moveUp: "Move up",
    moveDown: "Move down",
    domains: "Domains",
    paths: "Paths",
    excludedDomains: "Excluded Domains",
    useCurrentDomain: "Domain",
    rules: "Rules",
    addHeader: "+ Header",
    addQuery: "+ Query",
    emptyRules: "No rules yet. Add a header or query parameter to edit it here.",
    headers: "Headers",
    queryReplace: "Query Replace",
    name: "Name",
    key: "Key",
    value: "Value",
    headerNamePlaceholder: "e.g. x-env-name",
    headerValuePlaceholder: "e.g. feature_branch",
    templateValueSource: "Auto value",
    templateValueSourcePlaceholder: "xpath://meta[@name='env']/@content or css:#env",
    queryKeyPlaceholder: "e.g. env",
    queryValuePlaceholder: "e.g. feature_branch",
    tabGroup: "Tab Group",
    matched: "Matched",
    paused: "Paused",
    newEnv: "New Env"
  }
};

const LANGUAGE_STORAGE_KEY = "browser-group-env.language";
const ENV_DETAIL_TAB_STORAGE_KEY = "browser-group-env.envDetailTab";

type DraftLists = {
  domains: string;
  paths: string;
  excludedDomains: string;
};

type EnvDetailTab = "workspace" | "rules";
const ENV_DETAIL_TABS: EnvDetailTab[] = ["rules", "workspace"];
const ENV_DETAIL_CONTENT_CLASS_NAME =
  "min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-4 pb-8 pt-3";
const HEADER_CONTROLS_CLASS_NAME =
  "flex min-w-0 shrink-0 flex-nowrap items-center justify-end gap-1.5 text-notion-slate";
const INPUT_CLEAR_BUTTON_CLASS_NAME =
  "absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-notion-steel opacity-0 transition hover:bg-notion-surface hover:text-notion-charcoal group-hover:opacity-100 group-focus-within:opacity-100";

type PopupAppProps = {
  layout?: "popup" | "page" | "sidepanel";
  templateManagerInitialOpen?: boolean;
  templateManagerTarget?: "modal" | "page";
  sourceTabId?: number;
};

export function PopupApp({
  layout = "popup",
  templateManagerInitialOpen = false,
  templateManagerTarget = "modal",
  sourceTabId
}: PopupAppProps = {}) {
  const [state, setState] = useState<GlobalState | null>(null);
  const [context, setContext] = useState<ActiveContext>({});
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState<Language>(() => readLanguage());
  const [templateManagerOpen, setTemplateManagerOpen] = useState(templateManagerInitialOpen);
  const [pendingDeleteEnvId, setPendingDeleteEnvId] = useState<string>();
  const [pendingManualSwitchEnvId, setPendingManualSwitchEnvId] = useState<string>();
  const [draftLists, setDraftLists] = useState<DraftLists>({
    domains: "",
    paths: "",
    excludedDomains: ""
  });

  const reload = useCallback(async () => {
    const [nextState, nextContext] = await Promise.all([loadState(), getActiveContext()]);
    const reconciledState = reconcileGroupBindings(nextState, nextContext.availableGroups ?? []);
    const autoSelectedId = nextContext.groupKey
      ? reconciledState.groupBindings[nextContext.groupKey]?.envId
      : undefined;
    const selectedEnvId =
      reconciledState.autoSwitch && autoSelectedId ? autoSelectedId : reconciledState.selectedEnvId;

    const syncedState =
      selectedEnvId && selectedEnvId !== reconciledState.selectedEnvId
        ? { ...reconciledState, selectedEnvId }
        : reconciledState;

    if (syncedState !== nextState) {
      await saveState(syncedState);
    }

    setState(syncedState);
    setContext(nextContext);
  }, []);

  useEffect(() => {
    void reload();
    return onStateChanged(() => void reload());
  }, [reload]);

  const selectedEnv = useMemo(() => {
    if (!state) {
      return undefined;
    }
    return state.selectedEnvId ? state.envs[state.selectedEnvId] : Object.values(state.envs)[0];
  }, [state]);

  useEffect(() => {
    if (!selectedEnv) {
      return;
    }
    setDraftLists({
      domains: selectedEnv.filters.domains.join(", "),
      paths: selectedEnv.filters.paths.join(", "),
      excludedDomains: selectedEnv.filters.excludedDomains.join(", ")
    });
  }, [selectedEnv?.id]);

  const diagnostics = useMemo(
    () => (state ? getDiagnostics(state, context) : undefined),
    [state, context]
  );
  const t = useCallback((key: MessageKey) => MESSAGES[language][key], [language]);
  const toggleLanguage = useCallback(() => {
    setLanguage((current) => {
      const next = current === "zh" ? "en" : "zh";
      writeLanguage(next);
      return next;
    });
  }, []);
  const pendingDeleteEnv = pendingDeleteEnvId ? state?.envs[pendingDeleteEnvId] : undefined;
  const pendingManualSwitchEnv = pendingManualSwitchEnvId
    ? state?.envs[pendingManualSwitchEnvId]
    : undefined;
  const pendingDeleteActiveBound = Boolean(
    pendingDeleteEnvId &&
      context.groupKey &&
      state?.groupBindings[context.groupKey]?.envId === pendingDeleteEnvId
  );

  const mutateState = useCallback(
    async (mutator: (current: GlobalState) => GlobalState) => {
      const current = state ?? (await loadState());
      const next = mutator(current);
      await saveState(next);
      setState(next);
      await refreshRules();
    },
    [state]
  );

  const updateSelectedEnv = useCallback(
    async (updater: (env: Env) => Env) => {
      if (!selectedEnv) {
        return;
      }
      await mutateState((current) => {
        const env = current.envs[selectedEnv.id];
        if (!env) {
          return current;
        }
        const nextEnv = sanitizeEnv({
          ...updater(env),
          updatedAt: Date.now()
        });
        return {
          ...current,
          envs: {
            ...current.envs,
            [nextEnv.id]: nextEnv
          }
        };
      });
    },
    [mutateState, selectedEnv]
  );

  const applyManualEnvSelect = useCallback(
    (envId: string) => {
      void mutateState((current) => selectEnvManually(current, envId));
    },
    [mutateState]
  );

  const requestSelectEnv = useCallback(
    (envId: string) => {
      if (
        shouldConfirmManualEnvSwitch({
          autoSwitch: Boolean(state?.autoSwitch),
          selectedEnvId: selectedEnv?.id,
          nextEnvId: envId
        })
      ) {
        setPendingManualSwitchEnvId(envId);
        return;
      }
      applyManualEnvSelect(envId);
    },
    [applyManualEnvSelect, selectedEnv?.id, state?.autoSwitch]
  );

  const envs = useMemo(() => Object.values(state?.envs ?? {}), [state]);
  const filteredEnvs = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return envs;
    }
    return envs.filter((env) => {
      const bindingTitles = env.linkedGroupKeys
        .map((groupKey) => state?.groupBindings[groupKey]?.title)
        .join(" ");
      return `${env.name} ${env.scope} ${formatRuleSummary(env, language)} ${bindingTitles}`.toLowerCase().includes(keyword);
    });
  }, [envs, language, search, state?.groupBindings]);

  if (!state || !diagnostics) {
    return (
      <main className="grid min-h-screen place-items-center bg-notion-surface text-notion-ink">
        <div className="rounded-lg border border-notion-hairline bg-white px-4 py-3 text-sm text-notion-slate">
          {MESSAGES[language].noEnvConfig}
        </div>
      </main>
    );
  }

  const isPageLayout = layout === "page";
  const isSidePanelLayout = layout === "sidepanel";

  return (
    <main
      className={`overflow-hidden bg-notion-surface text-notion-ink ${
        isPageLayout || isSidePanelLayout ? "h-screen w-screen" : "h-[600px] w-[760px]"
      }`}
    >
      <section className="hero-reveal relative flex h-full w-full flex-col overflow-hidden bg-white shadow-workspace">
        <PopupHeader
          enabled={state.enabled}
          autoSwitch={state.autoSwitch}
          diagnostics={diagnostics}
          language={language}
          groupColor={context.groupColor}
          t={t}
          onToggleEnabled={() =>
            void mutateState((current) => ({ ...current, enabled: !current.enabled }))
          }
          onToggleAuto={() =>
            void mutateState((current) => ({ ...current, autoSwitch: !current.autoSwitch }))
          }
          onToggleLanguage={toggleLanguage}
          onOpenTemplates={() => {
            if (templateManagerTarget === "page") {
              void openTemplateManagerPage();
              return;
            }
            setTemplateManagerOpen(true);
          }}
          onOpenPanel={isSidePanelLayout ? undefined : () => void openSidePanel()}
        />
        {isSidePanelLayout ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-notion-surface">
            <SidePanelEnvSelector
              envs={envs}
              selectedEnvId={selectedEnv?.id}
              t={t}
              onSelect={requestSelectEnv}
              onCreate={() =>
                void createEnvForCurrentContext(state, context).then((next) =>
                  mutateState(() => next)
                )
              }
            />
            <div className="min-h-0 flex-1">
              {selectedEnv ? (
                <EnvDetailView
                  env={selectedEnv}
                  state={state}
                  context={context}
                  draftLists={draftLists}
                  templates={Object.values(state.templates)}
                  diagnostics={diagnostics}
                  t={t}
                  sourceTabId={sourceTabId}
                  onDraftLists={setDraftLists}
                  onUpdateEnv={updateSelectedEnv}
                  onCommitFilters={() =>
                    void updateSelectedEnv((env) => ({
                      ...env,
                      filters: {
                        domains: splitList(draftLists.domains),
                        paths: splitList(draftLists.paths),
                        excludedDomains: splitList(draftLists.excludedDomains)
                      }
                    }))
                  }
                  onMutateState={mutateState}
                  onDeleteEnv={(envId) => setPendingDeleteEnvId(envId)}
                />
              ) : (
                <EmptyEnvState
                  t={t}
                  onCreate={() =>
                    void createEnvForCurrentContext(state, context).then((next) =>
                      mutateState(() => next)
                    )
                  }
                />
              )}
            </div>
          </div>
        ) : (
          <div
            className="grid min-h-0 flex-1 grid-cols-[220px_minmax(0,1fr)] overflow-hidden bg-notion-surface"
          >
            <EnvList
              envs={filteredEnvs}
              selectedEnvId={selectedEnv?.id}
              groupBindings={state.groupBindings}
              search={search}
              t={t}
              onSearch={setSearch}
              onSelect={requestSelectEnv}
              onReorder={(draggedEnvId, targetEnvId) =>
                void mutateState((current) => reorderEnvs(current, draggedEnvId, targetEnvId))
              }
              onDelete={(envId) => setPendingDeleteEnvId(envId)}
              onCreate={() =>
                void createEnvForCurrentContext(state, context).then((next) =>
                  mutateState(() => next)
                )
              }
            />
            {selectedEnv ? (
              <EnvDetailView
                env={selectedEnv}
                state={state}
                context={context}
                draftLists={draftLists}
                templates={Object.values(state.templates)}
                diagnostics={diagnostics}
                t={t}
                sourceTabId={sourceTabId}
                onDraftLists={setDraftLists}
                onUpdateEnv={updateSelectedEnv}
                onCommitFilters={() =>
                  void updateSelectedEnv((env) => ({
                    ...env,
                    filters: {
                      domains: splitList(draftLists.domains),
                      paths: splitList(draftLists.paths),
                      excludedDomains: splitList(draftLists.excludedDomains)
                    }
                  }))
                }
                onMutateState={mutateState}
                onDeleteEnv={(envId) => setPendingDeleteEnvId(envId)}
              />
            ) : (
              <EmptyEnvState
                t={t}
                onCreate={() =>
                  void createEnvForCurrentContext(state, context).then((next) =>
                    mutateState(() => next)
                  )
                }
              />
            )}
          </div>
        )}
        {templateManagerOpen ? (
          <TemplateManagerModal
            layout={layout}
            templates={Object.values(state.templates)}
            t={t}
            onClose={() => setTemplateManagerOpen(false)}
            onSaveTemplate={(template) =>
              mutateState((current) => ({
                ...current,
                templates: {
                  ...current.templates,
                  [template.id]: sanitizeEnvTemplate({
                    ...template,
                    updatedAt: Date.now()
                  })
                }
              }))
            }
            onDeleteTemplate={(templateId) =>
              void mutateState((current) => {
                const templates = { ...current.templates };
                delete templates[templateId];
                return {
                  ...current,
                  templates
                };
              })
            }
          />
        ) : null}
        {pendingDeleteEnv ? (
          <ConfirmDialog
            title={t("confirmDeleteTitle")}
            message={pendingDeleteActiveBound ? t("deleteActiveConfirm") : t("deleteConfirm")}
            confirmLabel={t("delete")}
            cancelLabel={t("cancel")}
            danger
            onCancel={() => setPendingDeleteEnvId(undefined)}
            onConfirm={() => {
              const envId = pendingDeleteEnv.id;
              setPendingDeleteEnvId(undefined);
              void mutateState((current) => deleteEnv(current, envId));
            }}
          />
        ) : null}
        {pendingManualSwitchEnv ? (
          <ConfirmDialog
            title={t("confirmManualSwitchTitle")}
            message={t("manualSwitchConfirm")}
            confirmLabel={t("switchToManual")}
            cancelLabel={t("cancel")}
            onCancel={() => setPendingManualSwitchEnvId(undefined)}
            onConfirm={() => {
              const envId = pendingManualSwitchEnv.id;
              setPendingManualSwitchEnvId(undefined);
              applyManualEnvSelect(envId);
            }}
          />
        ) : null}
      </section>
    </main>
  );
}

function PopupHeader({
  enabled,
  autoSwitch,
  diagnostics,
  language,
  groupColor,
  t,
  onToggleEnabled,
  onToggleAuto,
  onToggleLanguage,
  onOpenTemplates,
  onOpenPanel
}: {
  enabled: boolean;
  autoSwitch: boolean;
  diagnostics: MatchDiagnostics;
  language: Language;
  groupColor?: string;
  t: (key: MessageKey) => string;
  onToggleEnabled: () => void;
  onToggleAuto: () => void;
  onToggleLanguage: () => void;
  onOpenTemplates: () => void;
  onOpenPanel?: () => void;
}) {
  return (
    <header className="bg-white">
      <div className="flex min-h-11 items-center gap-2 border-b border-notion-hairline px-3 py-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <BrandIcon color={getGroupColorHex(groupColor)} />
          <StatusBadge diagnostics={diagnostics} language={language} t={t} />
        </div>

        <div className={getHeaderControlsClassName()}>
          <button
            onClick={onToggleEnabled}
            className={`whitespace-nowrap rounded-md border px-2 py-1 text-xs font-medium transition hover:border-notion-primary hover:text-notion-primary ${
              enabled
                ? "border-notion-primary bg-notion-lavender text-notion-primary"
                : "border-notion-hairline bg-notion-surface text-notion-steel"
            }`}
            title={enabled ? t("activeTitle") : t("pausedTitle")}
          >
            {enabled ? (
              <Power size={14} className="mr-1 inline" />
            ) : (
              <Pause size={14} className="mr-1 inline" />
            )}
            {enabled ? t("activeTitle") : t("pausedTitle")}
          </button>
          <button
            onClick={onToggleAuto}
            className={`whitespace-nowrap rounded-md border px-2.5 py-1 text-xs font-medium transition ${
              autoSwitch
                ? "border-notion-primary bg-notion-lavender text-notion-primary"
                : "border-notion-hairline bg-notion-surface text-notion-slate"
            }`}
          >
            <RefreshCw size={14} className="mr-1 inline" />
            {autoSwitch ? t("auto") : t("manual")}
          </button>
          <button
            onClick={onOpenTemplates}
            className="whitespace-nowrap rounded-md border border-notion-hairline px-2 py-1 text-xs font-medium text-notion-slate transition hover:border-notion-primary hover:text-notion-primary"
          >
            <FileText size={14} className="mr-1 inline" />
            {t("templates")}
          </button>
          {onOpenPanel ? (
            <button
              onClick={onOpenPanel}
              className="whitespace-nowrap rounded-md border border-notion-hairline px-2 py-1 text-xs font-medium text-notion-slate transition hover:border-notion-primary hover:text-notion-primary"
            >
              <PanelRightOpen size={14} className="mr-1 inline" />
              {t("openPanel")}
            </button>
          ) : null}
          <button
            onClick={onToggleLanguage}
            className="whitespace-nowrap rounded-md border border-notion-hairline px-2 py-1 text-xs font-medium text-notion-slate transition hover:border-notion-primary hover:text-notion-primary"
            title={t("switchLanguage")}
          >
            <Languages size={14} className="mr-1 inline" />
            {language === "zh" ? "EN" : "中"}
          </button>
        </div>
      </div>
    </header>
  );
}

function BrandIcon({ color }: { color: string }) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 128 128"
      aria-label="Browser Group Env"
      className="h-7 w-7 shrink-0 rounded-md"
    >
      <rect x="8" y="12" width="112" height="40" rx="18" fill={ICON_LAYER_COLOR} />
      <rect x="0" y="28" width="128" height="98" rx="20" fill={color} />
      <circle cx="17.5" cy="45.5" r="5.5" fill="#ff5f57" />
      <circle cx="34.5" cy="45.5" r="5.5" fill="#ffbd2e" />
      <circle cx="51.5" cy="45.5" r="5.5" fill="#28c840" />
      <text
        x="64"
        y="96"
        fill="#fff"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="43"
        fontWeight="700"
        textAnchor="middle"
      >
        ENV
      </text>
    </svg>
  );
}

function EnvList({
  envs,
  selectedEnvId,
  groupBindings,
  search,
  t,
  onSearch,
  onSelect,
  onReorder,
  onDelete,
  onCreate
}: {
  envs: Env[];
  selectedEnvId?: string;
  groupBindings: GlobalState["groupBindings"];
  search: string;
  t: (key: MessageKey) => string;
  onSearch: (value: string) => void;
  onSelect: (envId: string) => void;
  onReorder: (draggedEnvId: string, targetEnvId: string) => void;
  onDelete: (envId: string) => void;
  onCreate: () => void;
}) {
  const [draggingEnvId, setDraggingEnvId] = useState<string>();

  const handleDrop = (event: React.DragEvent, targetEnvId: string) => {
    event.preventDefault();
    const draggedEnvId =
      event.dataTransfer.getData("application/x-browser-group-env-id") || draggingEnvId;
    setDraggingEnvId(undefined);
    if (!draggedEnvId || draggedEnvId === targetEnvId) {
      return;
    }
    onReorder(draggedEnvId, targetEnvId);
  };

  return (
    <aside className="border-r border-notion-hairline bg-notion-soft">
      <div className="px-3 py-3">
        <label className="flex min-w-0 items-center gap-2 rounded-md border border-notion-hairline bg-white px-3 py-2 text-sm text-notion-steel">
          <ImeSafeInput
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            className="min-w-0 flex-1 bg-transparent outline-none"
            placeholder={t("searchPlaceholder")}
          />
          <Search size={17} className="shrink-0" />
        </label>
      </div>

      <nav className="max-h-[354px] overflow-y-auto pb-3">
        {envs.length === 0 ? (
          <div className="mx-3 rounded-lg border border-dashed border-notion-hairline bg-white px-3 py-8 text-center text-sm text-notion-steel">
            {t("emptyEnvList")}
          </div>
        ) : null}
        {envs.map((env, index) => {
          const selected = selectedEnvId === env.id;
          const envColor = getGroupColorHex(
            env.linkedGroupKeys
              .map((groupKey) => groupBindings[groupKey]?.color)
              .find(Boolean),
            env.enabled ? "#6d4aff" : "#9aa0a6"
          );
          return (
            <div
              key={env.id}
              draggable
              onDragStart={(event) => {
                setDraggingEnvId(env.id);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("application/x-browser-group-env-id", env.id);
              }}
              onDragEnd={() => setDraggingEnvId(undefined)}
              onDragOver={(event) => {
                if (draggingEnvId && draggingEnvId !== env.id) {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }
              }}
              onDrop={(event) => handleDrop(event, env.id)}
              className={`row-enter flex w-full items-center gap-3 px-3 py-3 text-left transition ${
                selected ? "bg-white" : "hover:bg-white/70"
              } ${
                draggingEnvId === env.id ? "opacity-45" : ""
              } group`}
              style={{ animationDelay: `${index * 45}ms` }}
              title={t("dragEnv")}
            >
              <GripVertical size={14} className="shrink-0 text-notion-steel" />
              <button
                type="button"
                onClick={() => onSelect(env.id)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <span
                  className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: envColor }}
                >
                  {env.name[0]?.toLowerCase() ?? "e"}
                  {selected ? (
                    <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-notion-green p-0.5 text-white">
                      <CheckCircle2 size={13} />
                    </span>
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm ${selected ? "font-semibold" : "font-medium"}`}>
                    {env.name}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(env.id);
                }}
                className="shrink-0 rounded p-1.5 text-red-600 opacity-0 transition hover:bg-red-50 group-hover:opacity-100 focus:opacity-100"
                title={t("delete")}
              >
                <Trash2 size={15} />
              </button>
            </div>
          );
        })}
      </nav>

      <div className="px-3">
        <button
          onClick={onCreate}
          className="flex w-full items-center gap-2 rounded-md border border-notion-hairline bg-white px-3 py-2 text-sm font-semibold text-notion-charcoal shadow-sm transition hover:border-notion-primary hover:text-notion-primary"
        >
          <span className="grid h-6 w-6 place-items-center rounded-full bg-notion-primary text-white">
            <Plus size={17} />
          </span>
          {t("createEnv")}
        </button>
      </div>
    </aside>
  );
}

function SidePanelEnvSelector({
  envs,
  selectedEnvId,
  t,
  onSelect,
  onCreate
}: {
  envs: Env[];
  selectedEnvId?: string;
  t: (key: MessageKey) => string;
  onSelect: (envId: string) => void;
  onCreate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);
  const selectedEnv = selectedEnvId ? envs.find((env) => env.id === selectedEnvId) : undefined;

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (
        shouldCloseDropdownOnDocumentClick({
          open,
          targetInside: Boolean(
            event.target instanceof Node && selectorRef.current?.contains(event.target)
          )
        })
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <section className="shrink-0 border-b border-notion-hairline bg-white p-3">
      <div className="flex items-center gap-2">
        <div ref={selectorRef} className="relative min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-notion-hairline bg-white px-3 text-left text-sm font-semibold text-notion-charcoal shadow-sm outline-none transition hover:border-notion-primary focus:border-notion-primary focus:ring-2 focus:ring-notion-primary/15"
          >
            <span className="truncate">{selectedEnv?.name ?? t("emptyEnvList")}</span>
            <ChevronDown
              size={16}
              className={`shrink-0 text-notion-steel transition ${open ? "rotate-180" : ""}`}
            />
          </button>
          {open ? (
            <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-64 overflow-y-auto rounded-md border border-notion-hairline bg-white p-1 shadow-lg">
              {envs.length ? (
                envs.map((env) => {
                  const selected = env.id === selectedEnvId;
                  return (
                    <button
                      key={env.id}
                      type="button"
                      onClick={() => {
                        onSelect(env.id);
                        setOpen(false);
                      }}
                      className={`flex w-full min-w-0 items-center justify-between gap-2 rounded px-2 py-2 text-left text-sm transition ${
                        selected
                          ? "bg-notion-lavender font-semibold text-notion-primary"
                          : "text-notion-charcoal hover:bg-notion-surface"
                      }`}
                    >
                      <span className="truncate">{env.name}</span>
                      {selected ? <CheckCircle2 size={15} className="shrink-0" /> : null}
                    </button>
                  );
                })
              ) : (
                <div className="px-2 py-4 text-center text-xs text-notion-steel">
                  {t("emptyEnvList")}
                </div>
              )}
            </div>
          ) : null}
        </div>
        <button
          onClick={onCreate}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-notion-primary text-white shadow-sm transition hover:bg-[#4534b3]"
          title={t("createEnv")}
          aria-label={t("createEnv")}
        >
          <Plus size={18} />
        </button>
      </div>
    </section>
  );
}

function EnvDetailView({
  env,
  state,
  context,
  draftLists,
  templates,
  diagnostics,
  t,
  sourceTabId,
  onDraftLists,
  onUpdateEnv,
  onCommitFilters,
  onMutateState,
  onDeleteEnv
}: {
  env: Env;
  state: GlobalState;
  context: ActiveContext;
  draftLists: DraftLists;
  templates: EnvTemplate[];
  diagnostics: MatchDiagnostics;
  t: (key: MessageKey) => string;
  sourceTabId?: number;
  onDraftLists: (value: DraftLists) => void;
  onUpdateEnv: (updater: (env: Env) => Env) => Promise<void>;
  onCommitFilters: () => void;
  onMutateState: (mutator: (current: GlobalState) => GlobalState) => Promise<void>;
  onDeleteEnv: (envId: string) => void;
}) {
  return (
    <EnvDetail
      env={env}
      state={state}
      context={context}
      draftLists={draftLists}
      templates={templates}
      diagnostics={diagnostics}
      t={t}
      onDraftLists={onDraftLists}
      onUpdateEnv={onUpdateEnv}
      onUpdateGlobalWorkspace={(updater) =>
        onMutateState((current) => ({
          ...current,
          globalWorkspace: updater(current.globalWorkspace ?? { items: [] })
        }))
      }
      onCommitFilters={onCommitFilters}
      onBindGroup={(group) =>
        void createBindingForGroup(env.id, group).then((binding) =>
          onMutateState((current) => replaceGroupBinding(current, binding))
        )
      }
      onUnbindGroup={(groupKey) =>
        void onMutateState((current) => {
          const nextBindings = { ...current.groupBindings };
          delete nextBindings[groupKey];
          const currentEnv = current.envs[env.id];
          return {
            ...current,
            groupBindings: nextBindings,
            envs: {
              ...current.envs,
              [env.id]: {
                ...currentEnv,
                linkedGroupKeys: currentEnv.linkedGroupKeys.filter(
                  (linkedGroupKey) => linkedGroupKey !== groupKey
                ),
                updatedAt: Date.now()
              }
            }
          };
        })
      }
      onDuplicate={() =>
        void onMutateState((current) => {
          const duplicated = duplicateEnv(env);
          return {
            ...current,
            selectedEnvId: duplicated.id,
            envs: {
              ...current.envs,
              [duplicated.id]: duplicated
            }
          };
        })
      }
      onDelete={() => onDeleteEnv(env.id)}
      onApplyTemplate={(template) => {
        void (async () => {
          const resolvedTemplate = await resolveTemplateDynamicValues(
            template,
            sourceTabId ?? context.tabId
          );
          onDraftLists({
            domains: resolvedTemplate.filters.domains.join(", "),
            paths: resolvedTemplate.filters.paths.join(", "),
            excludedDomains: resolvedTemplate.filters.excludedDomains.join(", ")
          });
          await onUpdateEnv((current) => applyTemplateToEnv(current, resolvedTemplate));
        })();
      }}
    />
  );
}

function EnvDetail({
  env,
  state,
  context,
  draftLists,
  templates,
  diagnostics,
  t,
  onDraftLists,
  onUpdateEnv,
  onUpdateGlobalWorkspace,
  onCommitFilters,
  onBindGroup,
  onUnbindGroup,
  onDuplicate,
  onDelete,
  onApplyTemplate
}: {
  env: Env;
  state: GlobalState;
  context: ActiveContext;
  draftLists: DraftLists;
  templates: EnvTemplate[];
  diagnostics: MatchDiagnostics;
  t: (key: MessageKey) => string;
  onDraftLists: (value: DraftLists) => void;
  onUpdateEnv: (updater: (env: Env) => Env) => Promise<void>;
  onUpdateGlobalWorkspace: (updater: (workspace: GlobalWorkspace) => GlobalWorkspace) => Promise<void>;
  onCommitFilters: () => void;
  onBindGroup: (group: AvailableTabGroup) => void;
  onUnbindGroup: (groupKey: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onApplyTemplate: (template: EnvTemplate) => void;
}) {
  const isGlobal = env.scope === "global";
  const availableGroups = context.availableGroups ?? [];
  const availableGroupKeys = new Set(availableGroups.map((group) => group.groupKey));
  const commitFilterDrafts = useCallback(
    (nextDrafts: DraftLists) => {
      void onUpdateEnv((current) => ({
        ...current,
        filters: {
          domains: splitList(nextDrafts.domains),
          paths: splitList(nextDrafts.paths),
          excludedDomains: splitList(nextDrafts.excludedDomains)
        }
      }));
    },
    [onUpdateEnv]
  );
  const useCurrentHostname = useCallback(
    (field: "domains" | "excludedDomains") => {
      if (!context.hostname) {
        return;
      }
      const nextDrafts = {
        ...draftLists,
        [field]: appendListValue(draftLists[field], context.hostname)
      };
      onDraftLists(nextDrafts);
      commitFilterDrafts(nextDrafts);
    },
    [commitFilterDrafts, context.hostname, draftLists, onDraftLists]
  );
  const unresolvedGroups = env.linkedGroupKeys
    .filter((groupKey) => !availableGroupKeys.has(groupKey))
    .map((groupKey) => ({
      groupKey,
      title: state.groupBindings[groupKey]?.title || groupKey,
      unresolved: true as const
    }));
  const visibleGroups = [
    ...availableGroups.map((group) => ({
      ...group,
      unresolved: false as const
    })),
    ...unresolvedGroups
  ];
  const [activeTab, setActiveTab] = useState<EnvDetailTab>(() =>
    getInitialEnvDetailTab(readEnvDetailTab())
  );
  const selectTab = useCallback((tab: EnvDetailTab) => {
    writeEnvDetailTab(tab);
    setActiveTab(tab);
  }, []);

  return (
    <section className="flex h-full min-w-0 flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-notion-hairline px-4 py-2.5">
        <div className="inline-flex rounded-md border border-notion-hairline bg-notion-soft p-0.5">
          {getEnvDetailTabs().map((tab) => (
            <TabButton
              key={tab}
              active={activeTab === tab}
              label={tab === "rules" ? t("rulesTab") : t("workspaceTab")}
              onClick={() => selectTab(tab)}
            />
          ))}
        </div>
      </div>

      <div className={getEnvDetailContentClassName()}>
        {activeTab === "workspace" ? (
          <WorkspaceCard
            env={env}
            globalWorkspace={state.globalWorkspace}
            t={t}
            onUpdateEnv={onUpdateEnv}
            onUpdateGlobalWorkspace={onUpdateGlobalWorkspace}
          />
        ) : (
          <>
            <EnvSettingsCard
              env={env}
              isGlobal={isGlobal}
              groups={visibleGroups}
              context={context}
              t={t}
              onUpdateEnv={onUpdateEnv}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              onBindGroup={onBindGroup}
              onUnbindGroup={onUnbindGroup}
            />
            {isEnvEmptyForTemplate(env) ? (
              <TemplateChooser templates={templates} t={t} onApplyTemplate={onApplyTemplate} />
            ) : null}
            <RuleCard env={env} t={t} onUpdateEnv={onUpdateEnv} />
            <FilterCard
              drafts={draftLists}
              t={t}
              onDrafts={onDraftLists}
              onCommit={onCommitFilters}
              onCommitDrafts={commitFilterDrafts}
              activeHostname={context.hostname}
              onUseCurrentHostname={useCurrentHostname}
              disabledReason={env.filters.domains.length === 0 ? t("noDomainDisabled") : undefined}
            />
          </>
        )}
      </div>
    </section>
  );
}

function TabButton({
  active,
  label,
  onClick
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "bg-white text-notion-primary shadow-sm"
          : "text-notion-slate hover:bg-white/70 hover:text-notion-primary"
      }`}
    >
      {label}
    </button>
  );
}

function EnvSettingsCard({
  env,
  isGlobal,
  groups,
  context,
  t,
  onUpdateEnv,
  onDuplicate,
  onDelete,
  onBindGroup,
  onUnbindGroup
}: {
  env: Env;
  isGlobal: boolean;
  groups: Array<
    | (AvailableTabGroup & { unresolved: false })
    | { groupKey: string; title: string; unresolved: true }
  >;
  context: ActiveContext;
  t: (key: MessageKey) => string;
  onUpdateEnv: (updater: (env: Env) => Env) => Promise<void>;
  onDuplicate: () => void;
  onDelete: () => void;
  onBindGroup: (group: AvailableTabGroup) => void;
  onUnbindGroup: (groupKey: string) => void;
}) {
  return (
    <details className="rounded-lg border border-notion-hairline bg-white">
      <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold text-notion-charcoal">
        {t("envSettings")}
      </summary>
      <div className="space-y-3 border-t border-notion-hairline bg-notion-soft p-3">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-notion-steel">
            {t("name")}
          </span>
          <ImeSafeInput
            value={env.name}
            onChange={(event) =>
              void onUpdateEnv((current) => ({
                ...current,
                name: event.target.value
              }))
            }
            className="mt-1.5 w-full rounded-md border border-notion-hairline bg-white px-2 py-1.5 text-sm font-semibold outline-none transition focus:border-notion-primary focus:ring-2 focus:ring-notion-primary/15"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-notion-hairline bg-white px-2 py-1.5 text-xs font-medium text-notion-slate">
            <input
              type="checkbox"
              checked={isGlobal}
              onChange={(event) =>
                void onUpdateEnv((current) => ({
                  ...current,
                  scope: event.target.checked ? "global" : "group"
                }))
              }
            />
            {t("alwaysOn")}
          </label>
          <IconButton icon={Copy} label={t("copy")} onClick={onDuplicate} />
          <IconButton icon={Trash2} label={t("delete")} danger onClick={onDelete} />
        </div>
        <BindingCard
          groups={groups}
          linkedGroupKeys={env.linkedGroupKeys}
          context={context}
          scope={env.scope}
          t={t}
          onBindGroup={onBindGroup}
          onUnbindGroup={onUnbindGroup}
        />
      </div>
    </details>
  );
}

function EmptyEnvState({
  t,
  onCreate
}: {
  t: (key: MessageKey) => string;
  onCreate: () => void;
}) {
  return (
    <section className="grid min-w-0 place-items-center bg-white p-6">
      <div className="max-w-[360px] rounded-lg border border-notion-hairline bg-notion-soft p-5 text-center">
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-lg bg-notion-lavender text-notion-primary">
          <Boxes size={22} />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-notion-ink">{t("emptyEnvTitle")}</h2>
        <p className="mt-2 text-sm leading-6 text-notion-slate">
          {t("emptyEnvDescription")}
        </p>
        <button
          onClick={onCreate}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-notion-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4534b3]"
        >
          <Plus size={16} />
          {t("createEnv")}
        </button>
      </div>
    </section>
  );
}

type TemplateDraft = {
  template: EnvTemplate;
  lists: DraftLists;
  sourceInputs: Record<string, string>;
};

function TemplateChooser({
  templates,
  t,
  onApplyTemplate
}: {
  templates: EnvTemplate[];
  t: (key: MessageKey) => string;
  onApplyTemplate: (template: EnvTemplate) => void;
}) {
  return (
    <section className="rounded-lg border border-dashed border-notion-primary/30 bg-notion-lavender/45 p-3">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-notion-ink">{t("chooseTemplate")}</h2>
        <p className="mt-1 text-xs text-notion-slate">{t("chooseTemplateDescription")}</p>
      </div>
      {templates.length ? (
        <div className="flex flex-wrap gap-2">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => onApplyTemplate(template)}
              className="rounded-md border border-notion-primary/25 bg-white px-2.5 py-1.5 text-xs font-semibold text-notion-primary shadow-sm transition hover:border-notion-primary"
            >
              {template.name}
              <span className="ml-2 text-notion-steel">{t("applyTemplate")}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-notion-hairline bg-white px-3 py-3 text-xs text-notion-steel">
          {t("noTemplates")}
        </div>
      )}
      <p className="mt-2 text-[11px] text-notion-steel">{t("templateAppliedHint")}</p>
    </section>
  );
}

function TemplateManagerModal({
  layout,
  templates,
  t,
  onClose,
  onSaveTemplate,
  onDeleteTemplate
}: {
  layout: "popup" | "page" | "sidepanel";
  templates: EnvTemplate[];
  t: (key: MessageKey) => string;
  onClose: () => void;
  onSaveTemplate: (template: EnvTemplate) => Promise<void>;
  onDeleteTemplate: (templateId: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | undefined>(templates[0]?.id);
  const selectedTemplate = templates.find((template) => template.id === selectedId);
  const [draft, setDraft] = useState<TemplateDraft>(() =>
    toTemplateDraft(selectedTemplate ?? createEnvTemplate({ name: t("newTemplate") }))
  );
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");

  useEffect(() => {
    if (selectedTemplate) {
      setDraft(toTemplateDraft(selectedTemplate));
    }
  }, [selectedTemplate?.id]);

  const updateTemplate = (updater: (template: EnvTemplate) => EnvTemplate) => {
    setDraft((current) => ({
      ...current,
      template: updater(current.template)
    }));
  };
  const updateTemplateList = (field: keyof DraftLists, value: string) => {
    setDraft((current) => ({
      ...current,
      lists: { ...current.lists, [field]: value }
    }));
  };
  const updateTemplateSourceInput = (ruleId: string, value: string) => {
    setDraft((current) => ({
      ...current,
      sourceInputs: {
        ...current.sourceInputs,
        [ruleId]: value
      }
    }));
  };

  const commitTemplate = async () => {
    setSaveStatus("saving");
    const template = sanitizeEnvTemplate({
      ...draft.template,
      filters: {
        domains: splitList(draft.lists.domains),
        paths: splitList(draft.lists.paths),
        excludedDomains: splitList(draft.lists.excludedDomains)
      },
      headers: draft.template.headers.map((rule) => ({
        ...rule,
        valueSource: parseTemplateValueSourceInput(draft.sourceInputs[rule.id] ?? "")
      }))
    });
    try {
      await onSaveTemplate(template);
      setSelectedId(template.id);
      setDraft(toTemplateDraft(template));
      setSaveStatus("saved");
      window.setTimeout(() => setSaveStatus("idle"), 1400);
    } catch {
      setSaveStatus("failed");
    }
  };
  const isPageLayout = layout === "page";

  return (
    <div className={`absolute inset-0 z-20 bg-black/20 ${isPageLayout ? "p-4" : "p-5"}`}>
      <div
        className={`mx-auto flex h-full flex-col overflow-hidden rounded-lg border border-notion-hairline bg-white shadow-workspace ${
          isPageLayout ? "w-[min(1120px,calc(100vw-2rem))]" : "max-w-[700px]"
        }`}
      >
        <div className="flex items-center justify-between border-b border-notion-hairline px-4 py-3">
          <h2 className="text-base font-semibold text-notion-ink">{t("templateManagerTitle")}</h2>
          <button
            onClick={onClose}
            className="rounded-md border border-notion-hairline px-2 py-1 text-xs font-semibold text-notion-slate hover:border-notion-primary hover:text-notion-primary"
          >
            {t("close")}
          </button>
        </div>
        <div
          className={`grid min-h-0 flex-1 ${
            isPageLayout ? "grid-cols-[260px_minmax(0,1fr)]" : "grid-cols-[190px_minmax(0,1fr)]"
          }`}
        >
          <aside className="border-r border-notion-hairline bg-notion-soft p-3">
            <button
              onClick={() => {
                const template = createEnvTemplate({ name: t("newTemplate") });
                setSelectedId(template.id);
                setDraft(toTemplateDraft(template));
              }}
              className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-notion-hairline bg-white px-2 py-2 text-xs font-semibold text-notion-primary"
            >
              <Plus size={14} />
              {t("newTemplate")}
            </button>
            <div className="space-y-1">
              {templates.length ? (
                templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedId(template.id)}
                    className={`w-full truncate rounded-md px-2 py-2 text-left text-xs ${
                      selectedId === template.id
                        ? "bg-white font-semibold text-notion-primary"
                        : "text-notion-slate hover:bg-white/70"
                    }`}
                  >
                    {template.name}
                  </button>
                ))
              ) : (
                <div className="rounded-md border border-dashed border-notion-hairline bg-white px-2 py-6 text-center text-xs text-notion-steel">
                  {t("noTemplates")}
                </div>
              )}
            </div>
          </aside>
          <section className="flex min-h-0 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <label className="block">
                <span className="text-xs font-semibold text-notion-steel">{t("templateName")}</span>
                <ImeSafeInput
                  value={draft.template.name}
                  onChange={(event) =>
                    updateTemplate((template) => ({ ...template, name: event.target.value }))
                  }
                  className="mt-1.5 w-full rounded-md border border-notion-hairline px-2 py-1.5 text-sm outline-none focus:border-notion-primary"
                />
              </label>
              <div className="mt-4 space-y-3">
                <FilterInput
                  label={t("domains")}
                  value={draft.lists.domains}
                  placeholder="pre.example.com, *.example.org"
                  onChange={(value) => updateTemplateList("domains", value)}
                  onBlur={() => {}}
                  onClear={() => updateTemplateList("domains", "")}
                />
                <FilterInput
                  label={t("paths")}
                  value={draft.lists.paths}
                  placeholder="/commerce/*, /api/*"
                  onChange={(value) => updateTemplateList("paths", value)}
                  onBlur={() => {}}
                  onClear={() => updateTemplateList("paths", "")}
                />
                <FilterInput
                  label={t("excludedDomains")}
                  value={draft.lists.excludedDomains}
                  placeholder="sso.example.com"
                  onChange={(value) => updateTemplateList("excludedDomains", value)}
                  onBlur={() => {}}
                  onClear={() => updateTemplateList("excludedDomains", "")}
                />
              </div>
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-notion-charcoal">{t("headers")}</h3>
                  <button
                    onClick={() =>
                      updateTemplate((template) => ({
                        ...template,
                        headers: [...template.headers, createHeaderRule({ name: "", value: "" })]
                      }))
                    }
                    className="rounded-md border border-notion-hairline px-2 py-1 text-xs font-semibold text-notion-primary"
                  >
                    {t("addHeader")}
                  </button>
                </div>
                <TemplateHeaderTable
                  rows={draft.template.headers}
                  sourceInputs={draft.sourceInputs}
                  t={t}
                  onChange={(ruleId, patch) =>
                    updateTemplate((template) => ({
                      ...template,
                      headers: template.headers.map((rule) =>
                        rule.id === ruleId ? { ...rule, ...patch } : rule
                      )
                    }))
                  }
                  onSourceChange={updateTemplateSourceInput}
                  onDelete={(ruleId) =>
                    setDraft((current) => {
                      const sourceInputs = { ...current.sourceInputs };
                      delete sourceInputs[ruleId];
                      return {
                        ...current,
                        sourceInputs,
                        template: {
                          ...current.template,
                          headers: current.template.headers.filter((rule) => rule.id !== ruleId)
                        }
                      };
                    })
                  }
                />
              </div>
            </div>
            <div className="flex justify-between border-t border-notion-hairline bg-white p-4">
              <button
                onClick={() => {
                  if (templates.some((template) => template.id === draft.template.id)) {
                    onDeleteTemplate(draft.template.id);
                  }
                  const nextTemplate = templates.find((template) => template.id !== draft.template.id);
                  setSelectedId(nextTemplate?.id);
                  setDraft(toTemplateDraft(nextTemplate ?? createEnvTemplate({ name: t("newTemplate") })));
                }}
                className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                {t("delete")}
              </button>
              <button
                onClick={commitTemplate}
                disabled={saveStatus === "saving"}
                className="rounded-md bg-notion-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#4534b3]"
              >
                {saveStatus === "saving"
                  ? t("savingTemplate")
                  : saveStatus === "saved"
                    ? t("templateSaved")
                    : saveStatus === "failed"
                      ? t("templateSaveFailed")
                      : t("saveTemplate")}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger = false,
  onConfirm,
  onCancel
}: {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-black/20 p-5">
      <div className="w-full max-w-[360px] rounded-lg border border-notion-hairline bg-white p-4 shadow-workspace">
        <h2 className="text-base font-semibold text-notion-ink">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-notion-slate">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-notion-hairline px-3 py-1.5 text-xs font-semibold text-notion-slate transition hover:border-notion-primary hover:text-notion-primary"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              danger
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-notion-primary text-white hover:bg-[#4534b3]"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function BindingCard({
  groups,
  linkedGroupKeys,
  context,
  scope,
  t,
  onBindGroup,
  onUnbindGroup
}: {
  groups: Array<
    | (AvailableTabGroup & { unresolved: false })
    | { groupKey: string; title: string; unresolved: true }
  >;
  linkedGroupKeys: string[];
  context: ActiveContext;
  scope: Env["scope"];
  t: (key: MessageKey) => string;
  onBindGroup: (group: AvailableTabGroup) => void;
  onUnbindGroup: (groupKey: string) => void;
}) {
  const isGlobal = scope === "global";
  const linkedGroupKeySet = new Set(linkedGroupKeys);

  return (
    <section className="rounded-lg border border-notion-hairline bg-white p-3">
      <div className="mb-3 flex items-center gap-2">
        <Link2 size={18} className="text-notion-primary" />
        <h2 className="font-semibold">{t("groupsTitle")}</h2>
      </div>
      <div className="flex flex-wrap gap-2">
        {isGlobal ? (
          <span className="rounded-md bg-notion-mint px-2 py-1 text-xs font-medium text-notion-green">
            {t("globalNoGroup")}
          </span>
        ) : groups.length ? (
          groups.map((group) => {
            const bound = linkedGroupKeySet.has(group.groupKey);
            const current = group.groupKey === context.groupKey;
            const groupColor = getGroupColorHex("color" in group ? group.color : undefined);
            return (
              <button
                key={group.groupKey}
                type="button"
                onClick={() => {
                  if (bound) {
                    onUnbindGroup(group.groupKey);
                    return;
                  }
                  if (!group.unresolved) {
                    onBindGroup(group);
                  }
                }}
                disabled={group.unresolved && !bound}
                className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-55"
                style={{
                  borderColor: current || bound ? groupColor : "transparent",
                  backgroundColor: bound ? `${groupColor}1a` : "#f7f7f5",
                  color: bound || current ? groupColor : "#6b7280"
                }}
                title={
                  group.unresolved
                    ? t("groupUnavailable")
                    : bound
                      ? `${current ? `${t("currentGroupHint")}，` : ""}${t("unbind")}`
                      : `${current ? `${t("currentGroupHint")}，` : ""}${t("bind")}`
                }
              >
                {current ? (
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: groupColor }}
                    aria-hidden="true"
                  />
                ) : null}
                {group.title}
                {bound ? " ✓" : ""}
                {group.unresolved ? `（${t("restorePending")}）` : ""}
              </button>
            );
          })
        ) : (
          <span className="rounded-md bg-notion-surface px-2 py-1 text-xs text-notion-steel">
            {t("noAvailableGroups")}
          </span>
        )}
      </div>
    </section>
  );
}

function WorkspaceCard({
  env,
  globalWorkspace,
  t,
  onUpdateEnv,
  onUpdateGlobalWorkspace
}: {
  env: Env;
  globalWorkspace: GlobalWorkspace;
  t: (key: MessageKey) => string;
  onUpdateEnv: (updater: (env: Env) => Env) => Promise<void>;
  onUpdateGlobalWorkspace: (updater: (workspace: GlobalWorkspace) => GlobalWorkspace) => Promise<void>;
}) {
  const addGlobalItem = () => {
    void onUpdateGlobalWorkspace((current) => ({
      ...current,
      items: [...current.items, createWorkspaceItem({ type: getWorkspaceItemAddTypes()[0] })]
    }));
  };
  const addItem = () => {
    void onUpdateEnv((current) => ({
      ...current,
      workspace: {
        ...current.workspace,
        items: [...current.workspace.items, createWorkspaceItem({ type: getWorkspaceItemAddTypes()[0] })]
      }
    }));
  };
  const addTodo = () => {
    void onUpdateEnv((current) => ({
      ...current,
      workspace: {
        ...current.workspace,
        todos: [...current.workspace.todos, createWorkspaceTodo()]
      }
    }));
  };

  return (
    <section className="overflow-hidden rounded-lg border border-notion-hairline bg-white">
      <div className="space-y-4 p-3">
        <WorkspaceItems
          title={t("globalItems")}
          items={globalWorkspace.items}
          t={t}
          onAddItem={addGlobalItem}
          onChange={(itemId, patch) =>
            void onUpdateGlobalWorkspace((current) => ({
              ...current,
              items: current.items.map((item) =>
                item.id === itemId ? { ...item, ...patch, updatedAt: Date.now() } : item
              )
            }))
          }
          onDelete={(itemId) =>
            void onUpdateGlobalWorkspace((current) => ({
              ...current,
              items: current.items.filter((item) => item.id !== itemId)
            }))
          }
          onReorder={(draggedItemId, targetItemId) =>
            void onUpdateGlobalWorkspace((current) => ({
              ...current,
              items: reorderRows(current.items, draggedItemId, targetItemId)
            }))
          }
        />
        <WorkspaceItems
          title={t("envItems")}
          items={env.workspace.items}
          t={t}
          onAddItem={addItem}
          onChange={(itemId, patch) =>
            void onUpdateEnv((current) => ({
              ...current,
              workspace: {
                ...current.workspace,
                items: current.workspace.items.map((item) =>
                  item.id === itemId ? { ...item, ...patch, updatedAt: Date.now() } : item
                )
              }
            }))
          }
          onDelete={(itemId) =>
            void onUpdateEnv((current) => ({
              ...current,
              workspace: {
                ...current.workspace,
                items: current.workspace.items.filter((item) => item.id !== itemId)
              }
            }))
          }
          onReorder={(draggedItemId, targetItemId) =>
            void onUpdateEnv((current) => ({
              ...current,
              workspace: {
                ...current.workspace,
                items: reorderRows(current.workspace.items, draggedItemId, targetItemId)
              }
            }))
          }
        />
        <WorkspaceTodos
          todos={env.workspace.todos}
          t={t}
          onAddTodo={addTodo}
          onChange={(todoId, patch) =>
            void onUpdateEnv((current) => ({
              ...current,
              workspace: {
                ...current.workspace,
                todos: current.workspace.todos.map((todo) =>
                  todo.id === todoId ? { ...todo, ...patch, updatedAt: Date.now() } : todo
                )
              }
            }))
          }
          onDelete={(todoId) =>
            void onUpdateEnv((current) => ({
              ...current,
              workspace: {
                ...current.workspace,
                todos: current.workspace.todos.filter((todo) => todo.id !== todoId)
              }
            }))
          }
          onMove={(todoId, direction) =>
            void onUpdateEnv((current) => ({
              ...current,
              workspace: {
                ...current.workspace,
                todos: moveRow(current.workspace.todos, todoId, direction)
              }
            }))
          }
        />
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-notion-charcoal">
            <StickyNote size={15} className="text-notion-primary" />
            {t("notes")}
          </div>
          <ImeSafeTextarea
            value={env.workspace.notes}
            placeholder={t("notesPlaceholder")}
            onChange={(event) =>
              void onUpdateEnv((current) => ({
                ...current,
                workspace: {
                  ...current.workspace,
                  notes: event.target.value
                }
              }))
            }
            className="min-h-[88px] w-full resize-y rounded-md border border-notion-hairline bg-notion-soft px-2 py-2 text-xs leading-5 outline-none transition placeholder:text-notion-steel/70 focus:border-notion-primary focus:bg-white focus:ring-2 focus:ring-notion-primary/15"
          />
        </div>
      </div>
    </section>
  );
}

function WorkspaceItems({
  title,
  items,
  t,
  onAddItem,
  onChange,
  onDelete,
  onReorder
}: {
  title: string;
  items: WorkspaceItem[];
  t: (key: MessageKey) => string;
  onAddItem: () => void;
  onChange: (itemId: string, patch: Partial<Pick<WorkspaceItem, "title" | "value">>) => void;
  onDelete: (itemId: string) => void;
  onReorder: (draggedItemId: string, targetItemId: string) => void;
}) {
  const [draggingItemId, setDraggingItemId] = useState<string>();
  const [copiedItemId, setCopiedItemId] = useState<string>();
  const copiedTimerRef = useRef<number>();

  useEffect(
    () => () => {
      if (copiedTimerRef.current) {
        window.clearTimeout(copiedTimerRef.current);
      }
    },
    []
  );

  const handleDrop = (event: React.DragEvent, targetItemId: string) => {
    event.preventDefault();
    const draggedItemId =
      event.dataTransfer.getData("application/x-browser-group-workspace-item-id") ||
      draggingItemId;
    setDraggingItemId(undefined);
    if (!draggedItemId || draggedItemId === targetItemId) {
      return;
    }
    onReorder(draggedItemId, targetItemId);
  };

  const handleCopy = async (item: WorkspaceItem) => {
    if (!item.value.trim()) {
      return;
    }
    await runWorkspaceItemAction(item);
    setCopiedItemId(item.id);
    if (copiedTimerRef.current) {
      window.clearTimeout(copiedTimerRef.current);
    }
    copiedTimerRef.current = window.setTimeout(() => setCopiedItemId(undefined), 1200);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-notion-charcoal">
          <Copy size={15} className="text-notion-primary" />
          {title}
        </div>
        <button
          type="button"
          onClick={onAddItem}
          className="rounded-md border border-notion-hairline bg-white px-2 py-1 text-xs font-semibold text-notion-primary"
        >
          {t("addItem")}
        </button>
      </div>
      {items.length ? (
        <div className="space-y-1.5">
          {items.map((item) => {
            const actions = getWorkspaceItemActions(item.value);
            const isCopied = copiedItemId === item.id;
            const copyLabel = getWorkspaceItemCopyLabel(
              isCopied,
              t("copyValue"),
              t("copiedValue")
            );
            return (
              <div
                key={item.id}
                onDragOver={(event) => {
                  if (draggingItemId && draggingItemId !== item.id) {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                  }
                }}
                onDrop={(event) => handleDrop(event, item.id)}
                className={getWorkspaceItemRowClassName(draggingItemId === item.id)}
              >
                <span
                  className={getWorkspaceItemDragHandleClassName()}
                  draggable
                  onDragStart={(event) => {
                    setDraggingItemId(item.id);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData(
                      "application/x-browser-group-workspace-item-id",
                      item.id
                    );
                  }}
                  onDragEnd={() => setDraggingItemId(undefined)}
                  title={t("dragEnv")}
                  aria-hidden="true"
                >
                  <GripVertical size={14} />
                </span>
                <div className="min-w-0">
                  <RuleInput
                    value={item.title}
                    placeholder={t("snippetNamePlaceholder")}
                    onChange={(title) => onChange(item.id, { title })}
                  />
                </div>
                <div className="min-w-0">
                  <RuleInput
                    value={item.value}
                    placeholder={t("itemValuePlaceholder")}
                    onChange={(value) => onChange(item.id, { value })}
                  />
                </div>
                <div className="flex shrink-0 items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => void handleCopy(item)}
                    className={getWorkspaceItemActionButtonClassName("copy", isCopied)}
                    title={copyLabel}
                    aria-label={copyLabel}
                  >
                    {isCopied ? <CheckCircle2 size={15} /> : <Copy size={15} />}
                  </button>
                  {actions.includes("open") ? (
                    <button
                      type="button"
                      onClick={() => openWorkspaceItemLink(item.value)}
                      className={getWorkspaceItemActionButtonClassName("open", false)}
                      title={t("openLink")}
                      aria-label={t("openLink")}
                    >
                      <ExternalLink size={15} />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onDelete(item.id)}
                    className={getWorkspaceItemActionButtonClassName("delete", false)}
                    title={t("delete")}
                    aria-label={t("delete")}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-notion-hairline bg-notion-soft px-3 py-4 text-xs text-notion-steel">
          {t("emptyWorkspaceItems")}
        </div>
      )}
    </div>
  );
}

function WorkspaceTodos({
  todos,
  t,
  onAddTodo,
  onChange,
  onDelete,
  onMove
}: {
  todos: WorkspaceTodo[];
  t: (key: MessageKey) => string;
  onAddTodo: () => void;
  onChange: (todoId: string, patch: Partial<Pick<WorkspaceTodo, "title" | "done">>) => void;
  onDelete: (todoId: string) => void;
  onMove: (todoId: string, direction: "up" | "down") => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-notion-charcoal">
          <CheckCircle2 size={15} className="text-notion-primary" />
          {t("todos")}
        </div>
        <button
          type="button"
          onClick={onAddTodo}
          className="rounded-md border border-notion-hairline bg-white px-2 py-1 text-xs font-semibold text-notion-primary"
        >
          {t("addTodo")}
        </button>
      </div>
      {todos.length ? (
        <div className="space-y-1.5">
          {todos.map((todo, index) => (
            <div
              key={todo.id}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-notion-hairline bg-notion-soft px-2 py-1.5"
            >
              <input
                type="checkbox"
                checked={todo.done}
                onChange={(event) => onChange(todo.id, { done: event.target.checked })}
              />
              <RuleInput
                value={todo.title}
                placeholder={t("todoPlaceholder")}
                onChange={(value) => onChange(todo.id, { title: value })}
              />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onMove(todo.id, "up")}
                  disabled={index === 0}
                  className="rounded p-1.5 text-notion-steel transition hover:bg-white disabled:opacity-35"
                  title={t("moveUp")}
                >
                  <ArrowUp size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => onMove(todo.id, "down")}
                  disabled={index === todos.length - 1}
                  className="rounded p-1.5 text-notion-steel transition hover:bg-white disabled:opacity-35"
                  title={t("moveDown")}
                >
                  <ArrowDown size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(todo.id)}
                  className="rounded p-1.5 text-red-600 transition hover:bg-red-50"
                  title={t("delete")}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-notion-hairline bg-notion-soft px-3 py-3 text-xs text-notion-steel">
          {t("emptyTodos")}
        </div>
      )}
    </div>
  );
}

function FilterCard({
  drafts,
  t,
  onDrafts,
  onCommit,
  onCommitDrafts,
  activeHostname,
  onUseCurrentHostname,
  disabledReason
}: {
  drafts: DraftLists;
  t: (key: MessageKey) => string;
  onDrafts: (value: DraftLists) => void;
  onCommit: () => void;
  onCommitDrafts: (value: DraftLists) => void;
  activeHostname?: string;
  onUseCurrentHostname: (field: "domains" | "excludedDomains") => void;
  disabledReason?: string;
}) {
  const clearDraft = (field: keyof DraftLists) => {
    const nextDrafts = { ...drafts, [field]: "" };
    onDrafts(nextDrafts);
    onCommitDrafts(nextDrafts);
  };

  return (
    <section className="overflow-hidden rounded-lg border border-notion-hairline bg-white">
      <SectionHeader title={t("filters")} />
      <div className="space-y-3 bg-notion-soft p-3">
        <FilterInput
          label={t("domains")}
          value={drafts.domains}
          placeholder="pre.example.com, *.example.org"
          onChange={(value) => onDrafts({ ...drafts, domains: value })}
          onBlur={onCommit}
          onClear={() => clearDraft("domains")}
          actionLabel={t("useCurrentDomain")}
          actionDisabled={!activeHostname}
          onAction={() => onUseCurrentHostname("domains")}
        />
        <FilterInput
          label={t("paths")}
          value={drafts.paths}
          placeholder="/commerce/*, /api/*"
          onChange={(value) => onDrafts({ ...drafts, paths: value })}
          onBlur={onCommit}
          onClear={() => clearDraft("paths")}
        />
        <FilterInput
          label={t("excludedDomains")}
          value={drafts.excludedDomains}
          placeholder="sso.example.com"
          onChange={(value) => onDrafts({ ...drafts, excludedDomains: value })}
          onBlur={onCommit}
          onClear={() => clearDraft("excludedDomains")}
          actionLabel={t("useCurrentDomain")}
          actionDisabled={!activeHostname}
          onAction={() => onUseCurrentHostname("excludedDomains")}
        />
      </div>
      {disabledReason ? (
        <div className="border-t border-notion-hairline bg-notion-peach px-3 py-2 text-xs font-medium text-notion-orange">
          <AlertTriangle size={16} className="mr-2 inline" />
          {disabledReason}
        </div>
      ) : null}
    </section>
  );
}

function FilterInput({
  label,
  value,
  placeholder,
  onChange,
  onBlur,
  onClear,
  actionLabel,
  actionDisabled,
  onAction
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  onClear: () => void;
  actionLabel?: string;
  actionDisabled?: boolean;
  onAction?: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold uppercase tracking-[0.08em] text-notion-steel">
          {label}
        </label>
        {onAction ? (
          <button
            type="button"
            onClick={onAction}
            disabled={actionDisabled}
            title={actionLabel}
            aria-label={actionLabel}
            className="inline-flex h-6 items-center gap-1 rounded-md border border-notion-hairline bg-white px-2 text-[11px] font-medium text-notion-primary transition hover:border-notion-primary disabled:cursor-not-allowed disabled:text-notion-steel disabled:opacity-45"
          >
            <Plus size={12} />
            {actionLabel}
          </button>
        ) : null}
      </div>
      <div className="group relative mt-1.5">
        <ImeSafeInput
          ariaLabel={label}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          className="w-full rounded-md border border-notion-hairline bg-white py-1.5 pl-2 pr-7 text-xs outline-none transition placeholder:text-notion-steel/70 focus:border-notion-primary focus:ring-2 focus:ring-notion-primary/15"
        />
        <button
          type="button"
          onClick={onClear}
          className={getInputClearButtonClassName(Boolean(value), "right-1.5")}
          aria-label={`Clear ${label}`}
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

function RuleCard({
  env,
  t,
  onUpdateEnv
}: {
  env: Env;
  t: (key: MessageKey) => string;
  onUpdateEnv: (updater: (env: Env) => Env) => Promise<void>;
}) {
  const hasHeaders = env.rules.headers.length > 0;
  const hasQueries = env.rules.queries.length > 0;

  return (
    <section className="overflow-hidden rounded-lg border border-notion-hairline bg-white">
      <SectionHeader
        title={t("rules")}
        action={
          <div className="flex gap-2">
            <button
              onClick={() =>
                void onUpdateEnv((current) => ({
                  ...current,
                  rules: {
                    ...current.rules,
                    headers: [...current.rules.headers, createHeaderRule()]
                  }
                }))
              }
              className="rounded-md border border-notion-hairline px-2 py-1 text-xs font-semibold text-notion-primary"
            >
              {t("addHeader")}
            </button>
            <button
              onClick={() =>
                void onUpdateEnv((current) => ({
                  ...current,
                  rules: {
                    ...current.rules,
                    queries: [...current.rules.queries, createQueryRule()]
                  }
                }))
              }
              className="rounded-md border border-notion-hairline px-2 py-1 text-xs font-semibold text-notion-primary"
            >
              {t("addQuery")}
            </button>
          </div>
        }
      />
      <div className="p-3">
        {!hasHeaders && !hasQueries ? (
          <div className="rounded-md border border-dashed border-notion-hairline bg-notion-soft px-3 py-4 text-xs text-notion-steel">
            {t("emptyRules")}
          </div>
        ) : null}
        {hasHeaders ? (
          <RuleTable
            title={t("headers")}
            rows={env.rules.headers}
            columns={[
              { label: t("name"), field: "name", placeholder: t("headerNamePlaceholder") },
              { label: t("value"), field: "value", placeholder: t("headerValuePlaceholder") }
            ]}
            onChange={(ruleId, field, value) =>
              void onUpdateEnv((current) => ({
                ...current,
                rules: {
                  ...current.rules,
                  headers: current.rules.headers.map((rule) =>
                    rule.id === ruleId ? { ...rule, [field]: value } : rule
                  )
                }
              }))
            }
            onDelete={(ruleId) =>
              void onUpdateEnv((current) => ({
                ...current,
                rules: {
                  ...current.rules,
                  headers: current.rules.headers.filter((rule) => rule.id !== ruleId)
                }
              }))
            }
          />
        ) : null}
        {hasQueries ? (
          <div className={hasHeaders ? "mt-3" : undefined}>
          <RuleTable
            title={t("queryReplace")}
            rows={env.rules.queries}
            columns={[
              { label: t("key"), field: "key", placeholder: t("queryKeyPlaceholder") },
              { label: t("value"), field: "value", placeholder: t("queryValuePlaceholder") }
            ]}
            onChange={(ruleId, field, value) =>
              void onUpdateEnv((current) => ({
                ...current,
                rules: {
                  ...current.rules,
                  queries: current.rules.queries.map((rule) =>
                    rule.id === ruleId ? { ...rule, [field]: value } : rule
                  )
                }
              }))
            }
            onDelete={(ruleId) =>
              void onUpdateEnv((current) => ({
                ...current,
                rules: {
                  ...current.rules,
                  queries: current.rules.queries.filter((rule) => rule.id !== ruleId)
                }
              }))
            }
          />
          </div>
        ) : null}
      </div>
    </section>
  );
}

type EditableRuleRow = {
  id: string;
  value: string;
  name?: string;
  key?: string;
};

type RuleColumn = {
  label: string;
  field: "name" | "key" | "value";
  placeholder: string;
};

function TemplateHeaderTable({
  rows,
  sourceInputs,
  t,
  onChange,
  onSourceChange,
  onDelete
}: {
  rows: HeaderRule[];
  sourceInputs: Record<string, string>;
  t: (key: MessageKey) => string;
  onChange: (ruleId: string, patch: Partial<HeaderRule>) => void;
  onSourceChange: (ruleId: string, value: string) => void;
  onDelete: (ruleId: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-notion-hairline">
      <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,1.3fr)_34px] bg-notion-surface px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-notion-steel">
        <span>{t("name")}</span>
        <span>{t("value")}</span>
        <span>{t("templateValueSource")}</span>
        <span />
      </div>
      {rows.map((rule) => (
        <div
          key={rule.id}
          className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,1.3fr)_34px] items-center border-t border-notion-hairline px-2 py-1.5 text-xs"
        >
          <RuleInput
            value={rule.name}
            placeholder={t("headerNamePlaceholder")}
            onChange={(value) => onChange(rule.id, { name: value })}
          />
          <RuleInput
            value={rule.value}
            placeholder={t("headerValuePlaceholder")}
            onChange={(value) => onChange(rule.id, { value })}
          />
          <TemplateSourceInput
            value={sourceInputs[rule.id] ?? ""}
            placeholder={t("templateValueSourcePlaceholder")}
            onChange={(value) => onSourceChange(rule.id, value)}
          />
          <button
            onClick={() => onDelete(rule.id)}
            className="rounded p-1.5 text-red-600 transition hover:bg-red-50"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}

function TemplateSourceInput({
  value,
  placeholder,
  onChange
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="group relative mr-1 min-w-0">
      <ImeSafeInput
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        className="w-full min-w-0 rounded border border-transparent bg-transparent py-1 pl-1.5 pr-7 font-mono outline-none placeholder:text-notion-steel/70 focus:border-notion-primary focus:bg-white"
      />
      <button
        type="button"
        onClick={() => {
          onChange("");
        }}
        className={getInputClearButtonClassName(Boolean(value))}
        aria-label="Clear"
      >
        <X size={13} />
      </button>
    </div>
  );
}

function RuleTable<T extends EditableRuleRow>({
  title,
  rows,
  columns,
  onChange,
  onDelete
}: {
  title: string;
  rows: T[];
  columns: RuleColumn[];
  onChange: (ruleId: string, field: string, value: string) => void;
  onDelete: (ruleId: string) => void;
}) {
  const keyField = columns[0].field as "name" | "key";
  const keyPlaceholder = columns[0].placeholder;
  const valuePlaceholder = columns[1].placeholder;
  return (
    <div>
      {title ? <h3 className="mb-2 text-sm font-semibold text-notion-charcoal">{title}</h3> : null}
      <div className="overflow-hidden rounded-md border border-notion-hairline">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_34px] bg-notion-surface px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-notion-steel">
          {columns.map((column) => (
            <span key={column.field}>{column.label}</span>
          ))}
          <span />
        </div>
        {rows.map((rule) => (
            <div
              key={rule.id}
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_34px] items-center border-t border-notion-hairline px-2 py-1.5 text-xs"
            >
              <RuleInput
                value={String(rule[keyField] ?? "")}
                placeholder={keyPlaceholder}
                onChange={(value) => onChange(rule.id, keyField, value)}
              />
              <RuleInput
                value={rule.value}
                placeholder={valuePlaceholder}
                onChange={(value) => onChange(rule.id, "value", value)}
              />
              <button
                onClick={() => onDelete(rule.id)}
                className="rounded p-1.5 text-red-600 transition hover:bg-red-50"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}

function RuleInput({
  value,
  placeholder,
  onChange
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="group relative mr-1 min-w-0">
      <ImeSafeInput
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full min-w-0 rounded border border-transparent bg-transparent py-1 pl-1.5 pr-7 font-mono outline-none placeholder:text-notion-steel/70 focus:border-notion-primary focus:bg-white"
      />
      <button
        type="button"
        onClick={() => onChange("")}
        className={getInputClearButtonClassName(Boolean(value))}
        aria-label="Clear"
      >
        <X size={13} />
      </button>
    </div>
  );
}

function ImeSafeInput({
  value,
  onChange,
  onBlur,
  className,
  placeholder,
  ariaLabel
}: {
  value: string;
  onChange: (event: { target: { value: string } }) => void;
  onBlur?: () => void;
  className: string;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [draft, setDraft] = useState(value);
  const composingRef = useRef(false);

  useEffect(() => {
    if (!composingRef.current) {
      setDraft(value);
    }
  }, [value]);

  const commit = (nextValue: string) => {
    onChange({ target: { value: nextValue } });
  };

  return (
    <input
      aria-label={ariaLabel}
      value={draft}
      placeholder={placeholder}
      onCompositionStart={() => {
        composingRef.current = true;
      }}
      onCompositionEnd={(event) => {
        composingRef.current = false;
        const nextValue = event.currentTarget.value;
        setDraft(nextValue);
        commit(nextValue);
      }}
      onChange={(event) => {
        const nextValue = event.target.value;
        setDraft(nextValue);
        if (
          shouldCommitTextInputChange(
            composingRef.current || Boolean((event.nativeEvent as InputEvent).isComposing)
          )
        ) {
          commit(nextValue);
        }
      }}
      onBlur={() => {
        if (composingRef.current) {
          composingRef.current = false;
          commit(draft);
        }
        onBlur?.();
      }}
      className={className}
    />
  );
}

function ImeSafeTextarea({
  value,
  onChange,
  className,
  placeholder
}: {
  value: string;
  onChange: (event: { target: { value: string } }) => void;
  className: string;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value);
  const composingRef = useRef(false);

  useEffect(() => {
    if (!composingRef.current) {
      setDraft(value);
    }
  }, [value]);

  const commit = (nextValue: string) => {
    onChange({ target: { value: nextValue } });
  };

  return (
    <textarea
      value={draft}
      placeholder={placeholder}
      onCompositionStart={() => {
        composingRef.current = true;
      }}
      onCompositionEnd={(event) => {
        composingRef.current = false;
        const nextValue = event.currentTarget.value;
        setDraft(nextValue);
        commit(nextValue);
      }}
      onChange={(event) => {
        const nextValue = event.target.value;
        setDraft(nextValue);
        if (
          shouldCommitTextInputChange(
            composingRef.current || Boolean((event.nativeEvent as InputEvent).isComposing)
          )
        ) {
          commit(nextValue);
        }
      }}
      onBlur={() => {
        if (composingRef.current) {
          composingRef.current = false;
          commit(draft);
        }
      }}
      className={className}
    />
  );
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-notion-hairline px-3 py-2.5">
      <div className="flex items-center">
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function IconButton({
  icon: Icon,
  label,
  onClick,
  danger = false
}: {
  icon: typeof Copy;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md border px-2 py-1.5 text-xs font-medium shadow-sm transition ${
        danger
          ? "border-red-200 text-red-600 hover:bg-red-50"
          : "border-notion-hairline text-notion-slate hover:border-notion-primary hover:text-notion-primary"
      }`}
    >
      <Icon size={15} className="mr-1 inline" />
      {label}
    </button>
  );
}

function StatusBadge({
  diagnostics,
  language,
  t
}: {
  diagnostics: MatchDiagnostics;
  language: Language;
  t: (key: MessageKey) => string;
}) {
  const active = diagnostics.status === "active";
  const paused = diagnostics.status === "paused";
  const label = active
    ? t("matched")
    : paused
      ? t("paused")
      : formatDiagnosticMessage(diagnostics, language);
  return (
    <span
      title={label}
      className={`min-w-0 max-w-full truncate whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold ${
        active
          ? "bg-notion-mint text-notion-green"
          : paused
            ? "bg-notion-surface text-notion-steel"
            : "bg-notion-peach text-notion-orange"
      }`}
    >
      {label}
    </span>
  );
}

async function createEnvForCurrentContext(
  state: GlobalState,
  context: ActiveContext
): Promise<GlobalState> {
  const env = createEnv({
    name: context.groupTitle || context.hostname || MESSAGES[readLanguage()].newEnv,
    hostname: context.hostname,
    groupKey: context.groupKey
  });
  let nextState: GlobalState = {
    ...state,
    selectedEnvId: env.id,
    envs: {
      ...state.envs,
      [env.id]: env
    }
  };
  if (context.groupKey) {
    const binding = await createBindingForCurrentGroup(env.id);
    if (binding) {
      nextState = replaceGroupBinding(nextState, binding);
    }
  }
  return nextState;
}

function replaceGroupBinding(
  state: GlobalState,
  binding: GroupBinding
): GlobalState {
  const previousEnvId = state.groupBindings[binding.groupKey]?.envId;
  const nextEnvs = { ...state.envs };

  if (previousEnvId && nextEnvs[previousEnvId]) {
    nextEnvs[previousEnvId] = {
      ...nextEnvs[previousEnvId],
      linkedGroupKeys: nextEnvs[previousEnvId].linkedGroupKeys.filter(
        (groupKey) => groupKey !== binding.groupKey
      ),
      updatedAt: Date.now()
    };
  }

  const env = nextEnvs[binding.envId];
  nextEnvs[binding.envId] = {
    ...env,
    linkedGroupKeys: Array.from(new Set([...env.linkedGroupKeys, binding.groupKey])),
    updatedAt: Date.now()
  };

  return {
    ...state,
    selectedEnvId: binding.envId,
    envs: nextEnvs,
    groupBindings: {
      ...state.groupBindings,
      [binding.groupKey]: binding
    }
  };
}

export function deleteEnv(state: GlobalState, envId: string): GlobalState {
  const nextEnvs = { ...state.envs };
  delete nextEnvs[envId];
  const nextBindings = Object.fromEntries(
    Object.entries(state.groupBindings).filter(([, binding]) => binding.envId !== envId)
  );
  const nextSelected = Object.keys(nextEnvs)[0];
  return {
    ...state,
    selectedEnvId: nextSelected || undefined,
    envs: nextEnvs,
    groupBindings: nextBindings
  };
}

export function selectEnvManually(state: GlobalState, envId: string): GlobalState {
  const env = state.envs[envId];
  const shouldEnable = Boolean(env?.filters.domains.length);
  return {
    ...state,
    envs: env
      ? {
          ...state.envs,
          [envId]: {
            ...env,
            enabled: shouldEnable,
            updatedAt: shouldEnable && !env.enabled ? Date.now() : env.updatedAt
          }
        }
      : state.envs,
    selectedEnvId: envId,
    autoSwitch: false
  };
}

export function shouldConfirmManualEnvSwitch({
  autoSwitch,
  selectedEnvId,
  nextEnvId
}: {
  autoSwitch: boolean;
  selectedEnvId?: string;
  nextEnvId: string;
}): boolean {
  return autoSwitch && Boolean(selectedEnvId) && selectedEnvId !== nextEnvId;
}

export function reorderEnvs(
  state: GlobalState,
  draggedEnvId: string,
  targetEnvId: string
): GlobalState {
  if (draggedEnvId === targetEnvId) {
    return state;
  }
  const orderedIds = Object.keys(state.envs);
  if (!orderedIds.includes(draggedEnvId) || !orderedIds.includes(targetEnvId)) {
    return state;
  }
  const nextIds = orderedIds.filter((envId) => envId !== draggedEnvId);
  nextIds.splice(nextIds.indexOf(targetEnvId), 0, draggedEnvId);
  return {
    ...state,
    envs: Object.fromEntries(nextIds.map((envId) => [envId, state.envs[envId]]))
  };
}

export function updateWorkspaceItem(
  state: GlobalState,
  envId: string,
  itemId: string,
  patch: Partial<Pick<WorkspaceItem, "type" | "title" | "value">>,
  now = Date.now()
): GlobalState {
  const env = state.envs[envId];
  if (!env) {
    return state;
  }
  return {
    ...state,
    envs: {
      ...state.envs,
      [envId]: {
        ...env,
        workspace: {
          ...env.workspace,
          items: env.workspace.items.map((item) =>
            item.id === itemId ? { ...item, ...patch, updatedAt: now } : item
          )
        },
        updatedAt: now
      }
    }
  };
}

export function updateGlobalWorkspaceItem(
  state: GlobalState,
  itemId: string,
  patch: Partial<Pick<WorkspaceItem, "type" | "title" | "value">>,
  now = Date.now()
): GlobalState {
  return {
    ...state,
    globalWorkspace: {
      ...state.globalWorkspace,
      items: state.globalWorkspace.items.map((item) =>
        item.id === itemId ? { ...item, ...patch, updatedAt: now } : item
      )
    }
  };
}

export function updateWorkspaceTodo(
  state: GlobalState,
  envId: string,
  todoId: string,
  patch: Partial<Pick<WorkspaceTodo, "title" | "done">>,
  now = Date.now()
): GlobalState {
  const env = state.envs[envId];
  if (!env) {
    return state;
  }
  return {
    ...state,
    envs: {
      ...state.envs,
      [envId]: {
        ...env,
        workspace: {
          ...env.workspace,
          todos: env.workspace.todos.map((todo) =>
            todo.id === todoId ? { ...todo, ...patch, updatedAt: now } : todo
          )
        },
        updatedAt: now
      }
    }
  };
}

export function reorderWorkspaceItems(
  state: GlobalState,
  envId: string,
  draggedItemId: string,
  targetItemId: string
): GlobalState {
  const env = state.envs[envId];
  if (!env) {
    return state;
  }
  const items = reorderRows(env.workspace.items, draggedItemId, targetItemId);
  if (items === env.workspace.items) {
    return state;
  }
  return {
    ...state,
    envs: {
      ...state.envs,
      [envId]: {
        ...env,
        workspace: { ...env.workspace, items },
        updatedAt: Date.now()
      }
    }
  };
}

export function reorderWorkspaceTodos(
  state: GlobalState,
  envId: string,
  draggedTodoId: string,
  targetTodoId: string
): GlobalState {
  const env = state.envs[envId];
  if (!env) {
    return state;
  }
  const todos = reorderRows(env.workspace.todos, draggedTodoId, targetTodoId);
  if (todos === env.workspace.todos) {
    return state;
  }
  return {
    ...state,
    envs: {
      ...state.envs,
      [envId]: {
        ...env,
        workspace: { ...env.workspace, todos },
        updatedAt: Date.now()
      }
    }
  };
}

function reorderRows<T extends { id: string }>(
  rows: T[],
  draggedId: string,
  targetId: string
): T[] {
  if (draggedId === targetId) {
    return rows;
  }
  const draggedIndex = rows.findIndex((row) => row.id === draggedId);
  const targetIndex = rows.findIndex((row) => row.id === targetId);
  if (draggedIndex < 0 || targetIndex < 0) {
    return rows;
  }
  const nextRows = rows.filter((row) => row.id !== draggedId);
  nextRows.splice(targetIndex, 0, rows[draggedIndex]);
  return nextRows;
}

function moveRow<T extends { id: string }>(
  rows: T[],
  rowId: string,
  direction: "up" | "down"
): T[] {
  const index = rows.findIndex((row) => row.id === rowId);
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || targetIndex < 0 || targetIndex >= rows.length) {
    return rows;
  }
  const nextRows = [...rows];
  const [row] = nextRows.splice(index, 1);
  nextRows.splice(targetIndex, 0, row);
  return nextRows;
}

async function runWorkspaceItemAction(item: WorkspaceItem): Promise<void> {
  const value = item.value.trim();
  if (!value) {
    return;
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
  }
}

function openWorkspaceItemLink(value: string): void {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return;
  }
  window.open(normalizeWorkspaceUrl(trimmedValue), "_blank", "noopener");
}

export function getInitialEnvDetailTab(tab?: string): EnvDetailTab {
  return tab === "workspace" ? "workspace" : "rules";
}

export function readEnvDetailTab(storage: Storage | undefined = safeLocalStorage()): EnvDetailTab | undefined {
  const tab = storage?.getItem(ENV_DETAIL_TAB_STORAGE_KEY);
  return tab === "workspace" || tab === "rules" ? tab : undefined;
}

export function writeEnvDetailTab(
  tab: EnvDetailTab,
  storage: Storage | undefined = safeLocalStorage()
): void {
  storage?.setItem(ENV_DETAIL_TAB_STORAGE_KEY, tab);
}

export function getEnvDetailTabs(): EnvDetailTab[] {
  return [...ENV_DETAIL_TABS];
}

export function getEnvDetailContentClassName(): string {
  return ENV_DETAIL_CONTENT_CLASS_NAME;
}

export function getHeaderControlsClassName(): string {
  return HEADER_CONTROLS_CLASS_NAME;
}

export function getInputClearButtonClassName(
  hasValue: boolean,
  rightClassName = "right-1"
): string {
  return `${INPUT_CLEAR_BUTTON_CLASS_NAME} ${rightClassName} ${
    hasValue ? "" : "pointer-events-none"
  }`.trim();
}

export function getWorkspaceItemRowClassName(isDragging: boolean): string {
  return `group grid grid-cols-[18px_minmax(72px,0.36fr)_minmax(0,1fr)_auto] items-center gap-1.5 rounded-md border border-notion-hairline bg-notion-soft px-2 py-1.5 transition hover:bg-white ${
    isDragging ? "opacity-45" : ""
  }`.trim();
}

export function getWorkspaceItemDragHandleClassName(): string {
  return "grid h-7 w-[18px] shrink-0 cursor-grab place-items-center rounded text-notion-steel opacity-0 transition hover:bg-notion-surface active:cursor-grabbing group-hover:opacity-100 group-focus-within:opacity-100";
}

export function getWorkspaceItemActionButtonClassName(
  action: "copy" | "open" | "delete",
  active: boolean
): string {
  const tone =
    action === "delete"
      ? "border-transparent text-red-600 hover:border-red-200 hover:bg-red-50"
      : active
        ? "text-emerald-600 border-emerald-200 bg-emerald-50"
        : "border-transparent text-notion-primary hover:border-notion-hairline hover:bg-white";
  return `rounded border p-1.5 transition ${tone}`;
}

export function getWorkspaceItemCopyLabel(
  copied: boolean,
  copyLabel: string,
  copiedLabel: string
): string {
  return copied ? copiedLabel : copyLabel;
}

export function shouldCommitTextInputChange(isComposing: boolean): boolean {
  return !isComposing;
}

export function shouldCloseDropdownOnDocumentClick({
  open,
  targetInside
}: {
  open: boolean;
  targetInside: boolean;
}): boolean {
  return open && !targetInside;
}

export function isEnvSettingsTab(tab: EnvDetailTab): boolean {
  return tab === "rules";
}

export function getWorkspaceItemAddTypes(): Array<WorkspaceItem["type"]> {
  return ["text"];
}

export function getWorkspaceItemActions(value: string): Array<"copy" | "open"> {
  return isWorkspaceValueLink(value) ? ["copy", "open"] : ["copy"];
}

export function isWorkspaceValueLink(value: string): boolean {
  const trimmedValue = value.trim();
  if (!trimmedValue || /\s/.test(trimmedValue)) {
    return false;
  }
  if (/^https?:\/\//i.test(trimmedValue)) {
    return true;
  }
  if (/^(localhost|127(?:\.\d{1,3}){3})(?::\d+)?(?:[/?#].*)?$/i.test(trimmedValue)) {
    return true;
  }
  return /^[a-z0-9-]+(?:\.[a-z0-9-]+)+(?::\d+)?(?:[/?#].*)?$/i.test(trimmedValue);
}

function normalizeWorkspaceUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  if (/^(localhost|127(?:\.\d{1,3}){3})(?::\d+)?(?:[/?#].*)?$/i.test(value)) {
    return `http://${value}`;
  }
  return `https://${value}`;
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function appendListValue(value: string, item: string): string {
  const nextItem = item.trim();
  const values = splitList(value);
  if (!nextItem) {
    return values.join(", ");
  }
  if (values.some((existing) => existing.toLowerCase() === nextItem.toLowerCase())) {
    return values.join(", ");
  }
  return [...values, nextItem].join(", ");
}

function toTemplateDraft(template: EnvTemplate): TemplateDraft {
  return {
    template: structuredClone(template),
    lists: {
      domains: template.filters.domains.join(", "),
      paths: template.filters.paths.join(", "),
      excludedDomains: template.filters.excludedDomains.join(", ")
    },
    sourceInputs: Object.fromEntries(
      template.headers.map((rule) => [rule.id, formatTemplateValueSourceInput(rule.valueSource)])
    )
  };
}

function formatRuleSummary(env: Env, language: Language): string {
  const headers = env.rules.headers.filter((rule) => rule.enabled && rule.name).length;
  const queries = env.rules.queries.filter((rule) => rule.enabled && rule.key).length;
  return language === "zh"
    ? `${headers} 请求头 · ${queries} 查询参数`
    : `${headers} headers · ${queries} queries`;
}

function formatDiagnosticMessage(diagnostics: MatchDiagnostics, language: Language): string {
  if (language === "zh") {
    return diagnostics.message;
  }
  if (diagnostics.status === "paused") {
    return "Paused";
  }
  if (diagnostics.status === "no-tab") {
    return "No tab access";
  }
  if (diagnostics.status === "no-group") {
    return "No tab group";
  }
  if (diagnostics.status === "no-env") {
    return "No env bound";
  }
  if (diagnostics.status === "env-disabled") {
    return "Env disabled";
  }
  if (diagnostics.status === "no-domain") {
    return "No domain filter";
  }
  if (diagnostics.status === "not-matched") {
    return diagnostics.excluded ? "Excluded domain" : "Outside filters";
  }
  return "Matched";
}

function readLanguage(): Language {
  return safeLocalStorage()?.getItem(LANGUAGE_STORAGE_KEY) === "en" ? "en" : "zh";
}

function writeLanguage(language: Language) {
  safeLocalStorage()?.setItem(LANGUAGE_STORAGE_KEY, language);
}

function safeLocalStorage(): Storage | undefined {
  return typeof localStorage === "undefined" ? undefined : localStorage;
}
