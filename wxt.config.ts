import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  outDir: "output",
  manifest: {
    name: "__MSG_extName__",
    description: "__MSG_extDescription__",
    default_locale: "en",
    permissions: ["tabs", "tabGroups", "storage", "declarativeNetRequest", "scripting", "sidePanel"],
    host_permissions: ["<all_urls>"],
    icons: {
      "16": "icon/16.png",
      "32": "icon/32.png",
      "48": "icon/48.png",
      "128": "icon/128.png"
    },
    action: {
      default_title: "__MSG_extName__",
      default_icon: {
        "16": "icon/16.png",
        "32": "icon/32.png",
        "48": "icon/48.png",
        "128": "icon/128.png"
      }
    },
    options_ui: {
      page: "options.html",
      open_in_tab: true
    },
    side_panel: {
      default_path: "sidepanel.html"
    }
  }
});
