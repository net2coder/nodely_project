import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ComponentProps, useEffect } from "react";

type ThemeProviderProps = ComponentProps<typeof NextThemesProvider>;

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  useEffect(() => {
    // Ensure dark theme is applied immediately
    const htmlElement = document.documentElement;
    htmlElement.classList.add('dark');
  }, []);

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
