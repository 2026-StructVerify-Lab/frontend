// components/results/trace/ActionMeta.ts
//
// agent_loop이 호출하는 6가지 도구에 대한 아이콘·라벨·색상 매핑.
// ClaimCard(완료 결과)와 LiveClaimCard(진행 중) 둘 다 사용 — 진실원천 통합.

import {
  Search,
  Compass,
  Database,
  Calculator,
  Flag,
  FileText,
  Circle,
  RotateCcw,
} from "lucide-react";

export interface ActionMeta {
  icon: typeof Circle;
  label: string;
  tone: string;
}

export const ACTION_META: Record<string, ActionMeta> = {
  explore_catalog: {
    icon: Compass,
    label: "카탈로그 탐색",
    tone: "text-purple-600 dark:text-purple-400",
  },
  catalog_search: {
    icon: Search,
    label: "표 검색",
    tone: "text-blue-600 dark:text-blue-400",
  },
  fetch_evidence: {
    icon: Database,
    label: "데이터 조회",
    tone: "text-emerald-600 dark:text-emerald-400",
  },
  calculate: {
    icon: Calculator,
    label: "계산",
    tone: "text-amber-600 dark:text-amber-400",
  },
  read_original: {
    icon: FileText,
    label: "원문 읽기",
    tone: "text-slate-600 dark:text-slate-400",
  },
  replan: {
    icon: RotateCcw,
    label: "계획 재수립",
    tone: "text-indigo-600 dark:text-indigo-400",
  },
  finish: {
    icon: Flag,
    label: "검증 종료",
    tone: "text-rose-600 dark:text-rose-400",
  },
};

export function actionMeta(action: string): ActionMeta {
  return (
    ACTION_META[action] ?? {
      icon: Circle,
      label: action,
      tone: "text-muted-foreground",
    }
  );
}
