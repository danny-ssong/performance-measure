export type SettingsCategory = "general" | "notifications" | "plugins";

export type SettingsItem = {
  id: string;
  category: SettingsCategory;
  name: string;
  enabled: boolean;
};

export const CATEGORIES: { id: SettingsCategory; name: string }[] = [
  { id: "general", name: "일반" },
  { id: "notifications", name: "알림" },
  { id: "plugins", name: "플러그인" },
];

const items: SettingsItem[] = [
  { id: "dark-mode", category: "general", name: "다크 모드", enabled: true },
  { id: "slack", category: "notifications", name: "슬랙", enabled: true },
  { id: "messenger", category: "notifications", name: "메신저", enabled: false },
  { id: "plugin-1", category: "plugins", name: "플러그인 1", enabled: true },
  { id: "plugin-2", category: "plugins", name: "플러그인 2", enabled: false },
];

export function getItemsByCategory(category: SettingsCategory) {
  return items.filter((item) => item.category === category);
}

export function updateItem(id: string, enabled: boolean) {
  const item = items.find((i) => i.id === id);
  if (item) {
    item.enabled = enabled;
  }
  return item;
}
