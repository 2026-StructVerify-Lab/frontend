"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";

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
import { submitVerify } from "@/lib/api";
import { useJobWatcher } from "@/lib/jobWatcher";
import type { SourceType } from "@/lib/types";

export default function VerifyPage() {
  const router = useRouter();
  const { watch } = useJobWatcher();
  const [activeTab, setActiveTab] = useState<SourceType>("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [callbackUrl, setCallbackUrl] = useState("");
  const [useKosis, setUseKosis] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <AppShell>
      <div className="container max-w-3xl py-8 space-y-6">
        <h1 className="text-2xl font-semibold">새 검증</h1>

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
                <TabsTrigger value="text">텍스트</TabsTrigger>
                <TabsTrigger value="pdf">PDF</TabsTrigger>
                <TabsTrigger value="docx">DOCX</TabsTrigger>
                <TabsTrigger value="url">URL</TabsTrigger>
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

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end">
          <Button
            size="lg"
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
          >
            {submitting ? "제출 중…" : "검증 시작"}
          </Button>
        </div>
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