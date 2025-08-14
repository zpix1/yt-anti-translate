import { vi } from "vitest";

// Mock browser globals and extension APIs
global.chrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
  },
};

// Mock window.YoutubeAntiTranslate
global.window = global.window || {};
global.window.YoutubeAntiTranslate = {
  debounce: vi.fn((fn) => fn), // Simple debounce mock that returns the function as-is
  log: vi.fn(),
  extractVideoDataField: vi.fn(),
};

// Mock MutationObserver
global.MutationObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
}));

// Ensure document.body exists
if (typeof document !== "undefined" && !document.body) {
  document.body = document.createElement("body");
}
