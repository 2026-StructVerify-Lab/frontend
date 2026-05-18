"use client";

// components/layout/ThemeProvider.tsx
//
// next-themes 래퍼. SSR/CSR hydration mismatch를 알아서 처리하고
// `dark` 클래스를 <html>에 토글해줌 → globals.css의 .dark 변수가 적용됨.

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
