"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { submitVerify } from "@/lib/api";
import { useJobWatcher } from "@/lib/jobWatcher";
import type { SourceType } from "@/lib/types";

export default function VerifyPage() {
  const router = useRouter();
  const { watch, hasActiveJob, activeJob } = useJobWatcher();
  const [activeTab, setActiveTab] = useState<SourceType>("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [callbackUrl, setCallbackUrl] = useState("");
  const [useKosis, setUseKosis] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const datasources = useKosis ? ["kosis"] : [];
      const job = await submitVerify({
        source_type: activeTab,
        source_data: activeTab === "text" ? text : undefined,
        url: activeTab === "url" ? url : undefined,
        file: file ?? undefined,
        datasources,
        callback_url: callbackUrl || undefined,
      });
      // 글로벌 watcher에 등록 → 어느 페이지에서든 진행 표시됨
      watch(job.id);
      router.push(`/verify/jobs/${job.id}`);
    } catch (err: any) {
      setError(err.message ?? "요청 실패");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    (activeTab === "text" && text.trim().length > 0) ||
    (activeTab === "url" && url.trim().length > 0) ||
    ((activeTab === "pdf" || activeTab === "docx") && file !== null);

  // 진행 중이면 폼 잠금
  const locked = hasActiveJob;

  return (
    <AppShell>
      <div className="container max-w-3xl py-10 space-y-6">
        <div className="space-y-1">
          <h1 className="text-[28px] font-bold tracking-tight">새 검증</h1>
          <p className="text-sm text-muted-foreground">
            기사 본문, PDF, DOCX, URL 중 하나를 입력해 검증을 시작하세요.
          </p>
        </div>

        {/* 진행 중 안내 배너 — 폼 위로 띄움 */}
        {locked && activeJob && (
          <Card className="shadow-none border-foreground/20 bg-secondary">
            <CardContent className="p-4 flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-medium">
                  검증이 진행 중입니다
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  현재 검증 ({activeJob.progress}%)이 끝나야 새 검증을 시작할
                  수 있어요.
                </p>
              </div>
              <Link href={`/verify/jobs/${activeJob.id}`}>
                <Button size="sm" variant="outline">
                  진행 상황 보기
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <fieldset disabled={locked} className="space-y-6 disabled:opacity-60">
          <Card>
            <CardHeader>
              <CardTitle>입력</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as SourceType)}
              >
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="text" disabled={locked}>
                    텍스트
                  </TabsTrigger>
                  <TabsTrigger value="pdf" disabled={locked}>
                    PDF
                  </TabsTrigger>
                  <TabsTrigger value="docx" disabled={locked}>
                    DOCX
                  </TabsTrigger>
                  <TabsTrigger value="url" disabled={locked}>
                    URL
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="space-y-2">
                  <Label htmlFor="text-input">기사 본문</Label>
                  <Textarea
                    id="text-input"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="검증할 기사 본문을 붙여넣으세요."
                    rows={10}
                  />
                </TabsContent>

                <TabsContent value="pdf" className="space-y-2">
                  <FileDropZone
                    accept=".pdf,application/pdf"
                    file={file}
                    onChange={setFile}
                    hint="PDF 파일을 드래그하거나 클릭해서 업로드"
                  />
                </TabsContent>

                <TabsContent value="docx" className="space-y-2">
                  <FileDropZone
                    accept=".docx"
                    file={file}
                    onChange={setFile}
                    hint="DOCX 파일을 드래그하거나 클릭해서 업로드"
                  />
                </TabsContent>

                <TabsContent value="url" className="space-y-2">
                  <Label htmlFor="url-input">기사 URL</Label>
                  <Input
                    id="url-input"
                    type="url"
                    placeholder="https://..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>데이터 소스</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useKosis}
                  onChange={(e) => setUseKosis(e.target.checked)}
                />
                <span className="text-sm">KOSIS (공공)</span>
              </label>
              <p className="text-xs text-muted-foreground">
                회사 데이터 추가는{" "}
                <a href="/datasources" className="text-primary hover:underline">
                  데이터 소스 페이지
                </a>
                에서.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>옵션</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="callback">Webhook URL (선택)</Label>
                <Input
                  id="callback"
                  type="url"
                  placeholder="https://my-app/webhook"
                  value={callbackUrl}
                  onChange={(e) => setCallbackUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  검증 완료 시 이 URL로 POST 알림이 발사됩니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </fieldset>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end">
          {locked ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="inline-block cursor-not-allowed">
                  <Button
                    size="lg"
                    disabled
                    className="pointer-events-none"
                  >
                    검증 시작
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">검증이 진행 중입니다</p>
                <p className="text-muted-foreground text-[11px] mt-0.5">
                  현재 검증이 끝나야 새로 시작할 수 있어요
                </p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button
              size="lg"
              disabled={!canSubmit || submitting}
              onClick={() => setConfirmOpen(true)}
            >
              {submitting ? "제출 중…" : "검증 시작"}
            </Button>
          )}
        </div>

        {/* 검증 시작 전 확인 다이얼로그 — 실수로 제출하는 것 방지 */}
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="이 내용으로 검증을 시작하시겠습니까?"
          description={
            activeTab === "text"
              ? `텍스트 ${text.length.toLocaleString()}자를 검증합니다. 시작 후에는 결과 페이지에서 중단할 수 있어요.`
              : activeTab === "url"
              ? "URL의 본문을 가져와 검증합니다. 시작 후에는 결과 페이지에서 중단할 수 있어요."
              : `${file?.name ?? "파일"}을 검증합니다. 시작 후에는 결과 페이지에서 중단할 수 있어요.`
          }
          confirmText="검증 시작"
          cancelText="취소"
          onConfirm={handleSubmit}
        />
      </div>
    </AppShell>
  );
}

function FileDropZone({
  accept,
  file,
  onChange,
  hint,
}: {
  accept: string;
  file: File | null;
  onChange: (f: File | null) => void;
  hint: string;
}) {
  return (
    <label
      htmlFor="file-input"
      className="flex flex-col items-center justify-center border-2 border-dashed rounded-md p-12 cursor-pointer hover:border-primary transition-colors"
    >
      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
      <span className="text-sm text-muted-foreground">{hint}</span>
      {file && (
        <span className="mt-2 text-sm font-medium">
          {file.name} · {(file.size / 1024).toFixed(1)} KB
        </span>
      )}
      <input
        id="file-input"
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}