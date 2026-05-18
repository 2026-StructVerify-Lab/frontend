"use client";

// app/datasources/page.tsx — 데이터 소스 관리
//
// 검증 시 비교 기준이 되는 외부/내부 데이터 소스를 관리.
// - 기본 제공: KOSIS (한국 공공 통계)
// - 추가 가능 (미구현): CSV 업로드, 사내 DB DSN 연결, 구글 시트 등.

import { Database, Globe2, Plus, FileSpreadsheet, Lock } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function DataSourcesPage() {
  return (
    <AppShell>
      <div className="container max-w-5xl py-10 space-y-8">
        {/* 헤더 — 대시보드와 톤 통일 */}
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-[28px] font-bold tracking-tight">데이터 소스</h1>
            <p className="text-sm text-muted-foreground">
              검증 시 비교 기준으로 사용할 데이터 소스를 관리합니다.
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0} className="inline-block cursor-not-allowed">
                <Button size="sm" disabled className="pointer-events-none">
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  소스 추가
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p className="font-medium">곧 추가됩니다</p>
              <p className="text-muted-foreground text-[11px] mt-0.5">
                CSV 업로드 / 사내 DB 연결 기능 준비 중
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* 연결된 소스 */}
        <section className="space-y-3">
          <h2 className="text-[15px] font-semibold text-foreground/90">
            연결된 소스
          </h2>
          <DataSourceCard
            icon={<Globe2 className="h-5 w-5" />}
            name="KOSIS"
            description="국가통계포털 — 인구·경제·산업 등 한국 공공 통계"
            statusBadge={<Badge variant="match">활성</Badge>}
            badge="공공"
            href="https://kosis.kr"
          />
        </section>

        {/* 추가 가능한 소스 (placeholder) */}
        <section className="space-y-3">
          <h2 className="text-[15px] font-semibold text-foreground/90">
            추가 가능한 소스
          </h2>
          <p className="text-xs text-muted-foreground -mt-1">
            준비 중인 기능입니다. 출시되면 알려드릴게요.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ComingSoonCard
              icon={<FileSpreadsheet className="h-5 w-5" />}
              name="CSV / Excel 업로드"
              description="회사 보유 통계를 직접 업로드해 검증 기준으로 사용"
            />
            <ComingSoonCard
              icon={<Database className="h-5 w-5" />}
              name="사내 DB 연결"
              description="PostgreSQL · MySQL · BigQuery에 read-only로 연결"
            />
          </div>
        </section>
      </div>
    </AppShell>
  );
}

/** 활성 데이터 소스 카드 */
function DataSourceCard({
  icon,
  name,
  description,
  statusBadge,
  badge,
  href,
}: {
  icon: React.ReactNode;
  name: string;
  description: string;
  statusBadge: React.ReactNode;
  badge?: string;
  href?: string;
}) {
  return (
    <Card className="shadow-none hover:bg-accent/30 transition-colors">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="h-10 w-10 rounded-md bg-secondary flex items-center justify-center text-foreground shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-[14px] font-semibold">{name}</h3>
            {badge && (
              <Badge variant="outline" className="text-[10.5px] px-1.5 py-0">
                {badge}
              </Badge>
            )}
          </div>
          <p className="text-[12.5px] text-muted-foreground truncate">
            {description}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {statusBadge}
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11.5px] text-muted-foreground hover:text-foreground"
            >
              열기 ↗
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** 비활성 (준비 중) 카드 */
function ComingSoonCard({
  icon,
  name,
  description,
}: {
  icon: React.ReactNode;
  name: string;
  description: string;
}) {
  return (
    <Card className="shadow-none bg-secondary/40 border-dashed">
      <CardContent className="p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-md bg-background flex items-center justify-center text-muted-foreground shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <h3 className="text-[14px] font-medium text-foreground/80">
              {name}
            </h3>
            <Lock className="h-3 w-3 text-muted-foreground" />
          </div>
          <p className="text-[12.5px] text-muted-foreground">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
