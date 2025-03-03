declare module "*.json" {
    const value: {
      en: { copy_note_title: string; title_copied: string };
      es: { copy_note_title: string; title_copied: string };
    };
    export default value;
  }