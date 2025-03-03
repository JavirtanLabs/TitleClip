import { Plugin, Notice, PluginSettingTab, Setting } from "obsidian";
import * as fs from "fs";
import * as path from "path";

interface TitleClipSettings {
  includeExtension: boolean;
  language: string; // New setting for language selection
}

const DEFAULT_SETTINGS: TitleClipSettings = {
  includeExtension: false,
  language: "auto", // Default to automatic detection
};

export default class TitleClipPlugin extends Plugin {
  private lang: string;
  settings: TitleClipSettings;
  private translations: Record<string, any> = {};

  async onload() {
    console.log("TitleClip Plugin loaded");

    // Load user settings
    await this.loadSettings();

    // Detect or force user language
    this.lang = this.getUserLanguage();

    // Load translations from JSON file
    this.loadTranslations();

    // Register settings tab in the Community Plugins panel
    this.addSettingTab(new TitleClipSettingTab(this));

    // Register event to update menu when settings change
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (!file) return;
        this.addCopyTitleOption(menu, file);
      })
    );
  }

  onunload() {
    console.log("TitleClip Plugin unloaded");
  }

  /**
   * Detects the user's language based on settings or defaults to English.
   * @returns {string} Language code (e.g., "en", "es").
   */
  getUserLanguage(): string {
    if (this.settings.language !== "auto") {
      return this.settings.language;
    }

    const systemLang = navigator.language.split("-")[0]; // Get base language code
    return systemLang === "es" ? "es" : "en"; // Default to English if unsupported
  }

/**
 * Loads translations from translations.json into memory to improve performance.
 */
async loadTranslations() {
  try {
      // Define the absolute path to translations.json in the "data" folder
      const filePath = path.join(__dirname, "data", "translations.json");

      // Read the JSON file once and store it in memory
      const rawData = fs.readFileSync(filePath, "utf-8");
      this.translations = JSON.parse(rawData);
  } catch (error) {
      console.error("Failed to load translations.json:", error);

      // Fallback translations if the file is missing or invalid
      this.translations = {
          en: {
              copy_note_title: "Copy note title",
              title_copied: "Title copied: {title}"
          },
          es: {
              copy_note_title: "Copiar título de la nota",
              title_copied: "Título copiado: {title}"
          }
      };
  }
}

  /**
   * Adds the "Copy Note Title" option to the file menu.
   * Updates dynamically when language settings change.
   */
  addCopyTitleOption(menu: any, file: any) {
    const t = this.translations[this.lang] || this.translations["en"];
    menu.addItem((item: any) => {
      item
        .setTitle(t["copy_note_title"])
        .setIcon("copy")
        .onClick(async () => {
          const noteTitle = this.settings.includeExtension ? file.name : file.name.replace(/\.md$/, "");
          await navigator.clipboard.writeText(noteTitle);
          new Notice(t["title_copied"].replace("{title}", noteTitle));
        });
    });
  }

  /**
   * Loads user settings from Obsidian storage.
   */
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  /**
   * Saves user settings to Obsidian storage and updates UI.
   */
  async saveSettings() {
    await this.saveData(this.settings);
    this.lang = this.getUserLanguage(); // Update language immediately
    this.app.workspace.trigger("refresh-menu"); // Force menu update
  }
}

/**
 * Creates a settings panel inside the Community Plugins tab.
 */
class TitleClipSettingTab extends PluginSettingTab {
  plugin: TitleClipPlugin;

  constructor(plugin: TitleClipPlugin) {
    super(plugin.app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // Add plugin title and description
    containerEl.createEl("h2", { text: "TitleClip - Settings" });
    containerEl.createEl("p", {
      text: "TitleClip allows you to quickly copy the title of your notes from the tab menu or the more options menu. You can customize whether to include the .md extension and select the language."
    });

    // Setting: Include .md extension
    new Setting(containerEl)
      .setName("Include .md extension")
      .setDesc("If enabled, the copied note title will include the .md extension.")
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.includeExtension)
          .onChange(async (value) => {
            this.plugin.settings.includeExtension = value;
            await this.plugin.saveSettings();
          })
      );

    // Setting: Language Selection
    new Setting(containerEl)
      .setName("Language")
      .setDesc("Select the language for the plugin.")
      .addDropdown(dropdown =>
        dropdown
          .addOptions({
            auto: "Auto (based on system)",
            en: "English",
            es: "Español",
          })
          .setValue(this.plugin.settings.language)
          .onChange(async (value) => {
            this.plugin.settings.language = value;
            await this.plugin.saveSettings();
          })
      );

    // Button: Reset to Default Settings
    new Setting(containerEl)
      .setName("Reset to Defaults")
      .setDesc("Restore all settings to their default values.")
      .addButton(button =>
        button
          .setButtonText("Reset")
          .setWarning() // Makes the button red
          .onClick(async () => {
            this.plugin.settings = { ...DEFAULT_SETTINGS };
            await this.plugin.saveSettings();
            this.display(); // Refresh UI
          })
      );
  }
}