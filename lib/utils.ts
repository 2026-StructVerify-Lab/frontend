import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Tailwind className 안전하게 합치기.
 * shadcn/ui 컴포넌트의 표준 헬퍼.
 *
 *   cn("p-4", "p-2")           → "p-2"   (마지막 우선)
 *   cn("p-4", condition && "bg-red-500")
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
