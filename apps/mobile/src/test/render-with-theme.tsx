import { type ReactElement, type ReactNode, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

export function renderWithTheme(node: ReactElement, { isDark = false } = {}) {
  function ThemeWrapper({ children }: { children: ReactNode }) {
    return createElement(
      "div",
      { className: isDark ? "dark" : undefined, "data-testid": "theme-root" },
      children,
    );
  }

  return renderToStaticMarkup(createElement(ThemeWrapper, null, node));
}
