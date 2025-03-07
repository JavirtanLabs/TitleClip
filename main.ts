import { Plugin, Notice, PluginSettingTab, Setting } from "obsidian";

interface TitleClipSettings {
    includeExtension: boolean;
    language: string; // User-defined language selection
}

// Default plugin settings
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

        // Detect user language or use the selected one
        this.lang = this.getUserLanguage();

        // Initialize translations
        this.initTranslations();

        // Register settings tab
        this.addSettingTab(new TitleClipSettingTab(this));

        // Register file menu event
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
     * Determines the user's language based on settings or system preference.
     * @returns {string} Language code (e.g., "en", "es").
     */
    getUserLanguage(): string {
      if (this.settings.language !== "auto") {
          return this.settings.language;
      }
      const systemLang = navigator.language.split("-")[0];
      return systemLang === "es" ? "es" : "en";
    }

    /**
     * Initializes translations directly within the code for better performance.
     */
    initTranslations() {
        this.translations = {
            en: {
                copy_note_title: "Copy note title",
                title_copied: "Title copied: {title}",
                settings_title: "TitleClip - Settings",
                settings_desc: "TitleClip allows you to quickly copy note titles from the tab menu or the more options menu.",
                include_extension: "Include .md extension",
                include_extension_desc: "If enabled, the copied note title will include the .md extension.",
                language_selection: "Language",
                language_selection_desc: "Select the language for the plugin.",
                reset_settings: "Reset to Defaults",
                reset_settings_desc: "Restore all settings to their default values.",
                reset_button: "Reset",
                support_my_work: "Support my work",
                support_my_work_desc: "If you find this plugin useful, consider supporting me on Ko-fi!"
            },
            es: {
                copy_note_title: "Copiar título de la nota",
                title_copied: "Título copiado: {title}",
                settings_title: "TitleClip - Configuración",
                settings_desc: "TitleClip te permite copiar rápidamente los títulos de las notas desde el menú de pestañas o el menú de opciones.",
                include_extension: "Incluir extensión .md",
                include_extension_desc: "Si está habilitado, el título copiado incluirá la extensión .md.",
                language_selection: "Idioma",
                language_selection_desc: "Selecciona el idioma del plugin.",
                reset_settings: "Restablecer a valores predeterminados",
                reset_settings_desc: "Restaura todas las configuraciones a sus valores predeterminados.",
                reset_button: "Restablecer",
                support_my_work: "Apoya mi trabajo",
                support_my_work_desc: "Si este plugin te resulta útil, considera apoyarme en Ko-fi."
            }
        };
    }

    /**
     * Retrieves the translated string based on the user's language setting.
     * Falls back to English if the key is missing in the selected language.
     * @param {string} key - The translation key.
     * @returns {string} Translated string.
     */
    t(key: string): string {
        return this.translations[this.lang][key] || this.translations["en"][key];
    }

    /**
     * Adds the "Copy Note Title" option to the file menu.
     */
    addCopyTitleOption(menu: any, file: any) {
        const t = this.t("copy_note_title");

        menu.addItem((item: any) => {
            item
                .setTitle(t)
                .setIcon("copy")
                .onClick(async () => {
                    const noteTitle = this.settings.includeExtension ? file.name : file.name.replace(/\.md$/, "");
                    await navigator.clipboard.writeText(noteTitle);
                    new Notice(this.t("title_copied").replace("{title}", noteTitle));
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
        this.lang = this.getUserLanguage();
        this.app.workspace.trigger("refresh-menu"); // Refresh UI elements
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
        containerEl.createEl("h2", { text: this.plugin.t("settings_title") });
        containerEl.createEl("p", { text: this.plugin.t("settings_desc") });

        // Setting: Include .md extension
        new Setting(containerEl)
            .setName(this.plugin.t("include_extension"))
            .setDesc(this.plugin.t("include_extension_desc"))
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
            .setName(this.plugin.t("language_selection"))
            .setDesc(this.plugin.t("language_selection_desc"))
            .addDropdown(dropdown =>
                dropdown
                    .addOptions({
                        auto: "Auto (based on system)",
                        en: "English",
                        es: "Español"
                    })
                    .setValue(this.plugin.settings.language)
                    .onChange(async (value) => {
                        // Update the setting
                        this.plugin.settings.language = value;
                        // Save (this also updates lang internally)
                        await this.plugin.saveSettings();
                        
                        // Refresh the settings panel so we see immediate changes
                        this.display();
                    })
            );

        // Button: Reset to Default Settings
        new Setting(containerEl)
            .setName(this.plugin.t("reset_settings"))
            .setDesc(this.plugin.t("reset_settings_desc"))
            .addButton(button =>
                button
                    .setButtonText(this.plugin.t("reset_button"))
                    .setWarning()
                    .onClick(async () => {
                        this.plugin.settings = { ...DEFAULT_SETTINGS };
                        await this.plugin.saveSettings();
                        this.display(); // Refresh UI
                    })
            );

        // Setting: Support the developer
          new Setting(containerEl)
          .setName(this.plugin.t("support_my_work"))
          .setDesc(this.plugin.t("support_my_work_desc"));

        // Add Ko-fi donation button with image
        const kofiContainer = containerEl.createDiv();
        const kofiLink = kofiContainer.createEl("a", {
            href: "https://ko-fi.com/jvfldd", // Enlace de Ko-fi
            attr: { target: "_blank" } // Abre en nueva pestaña
        });
        kofiLink.createEl("img", {
            attr: {
                src: "https://storage.ko-fi.com/cdn/kofi5.png?v=6", // Imagen oficial de Ko-fi
                alt: "Buy Me a Coffee at Ko-fi.com",
                width: "150", // Ajuste del tamaño
                style: "margin-top: 5px; display: block;" // Espaciado visual y alineación
            }
        });
    }
}