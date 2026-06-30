import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { THEME_STORAGE_KEY, ThemeProvider, useTheme } from "./ThemeProvider";

function ThemeProbe() {
  const { theme, toggleTheme } = useTheme();
  return <><output aria-label="Current theme">{theme}</output><button onClick={toggleTheme}>Toggle theme</button></>;
}

describe("ThemeProvider", () => {
  beforeEach(() => { localStorage.clear(); delete document.documentElement.dataset.theme; });

  it("uses light by default and persists a dark-mode choice", async () => {
    const user = userEvent.setup();
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);
    expect(screen.getByLabelText("Current theme")).toHaveTextContent("light");
    await user.click(screen.getByRole("button", { name: "Toggle theme" }));
    expect(screen.getByLabelText("Current theme")).toHaveTextContent("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("synchronizes a theme change from another tab", () => {
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: THEME_STORAGE_KEY, newValue: "dark" })));
    expect(screen.getByLabelText("Current theme")).toHaveTextContent("dark");
  });
});
