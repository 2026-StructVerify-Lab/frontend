"use client";

import { useEffect, useState } from "react";
import { Copy, Trash2 } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  listApiKeys,
  createApiKey,
  revokeApiKey,
  setApiKey as cacheKey,
} from "@/lib/api";
import type { ApiKey } from "@/lib/types";

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  // 새로 생성된 raw key — 한 번만 보임
  const [newRawKey, setNewRawKey] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    const ks = await listApiKeys();
    setKeys(ks);
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const { key } = await createApiKey(newKeyName || "Untitled");
      setNewRawKey(key);
      // 편의: localStorage에도 저장 (SDK 테스트용)
      cacheKey(key);
      setNewKeyName("");
      await reload();
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm("정말 이 키를 취소하시겠습니까? 되돌릴 수 없습니다.")) return;
    await revokeApiKey(id);
    await reload();
  }

  return (
    <AppShell>
      <div className="container max-w-4xl py-8 space-y-6">
        <h1 className="text-2xl font-semibold">API 키</h1>

        {/* 새로 생성된 키 — 한 번만 표시 */}
        {newRawKey && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="text-base">
                새 API 키가 생성되었습니다
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                이 키는 <strong>지금 한 번만</strong> 표시됩니다. 안전한 곳에
                보관하세요.
              </p>
              <div className="flex gap-2">
                <Input value={newRawKey} readOnly className="font-mono text-xs" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigator.clipboard.writeText(newRawKey)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setNewRawKey(null)}>
                저장했습니다, 닫기
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 새 키 생성 */}
        <Card>
          <CardHeader>
            <CardTitle>새 키 발급</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex gap-2 items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="key-name">키 이름 (식별용)</Label>
                <Input
                  id="key-name"
                  placeholder="예: Production"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={creating}>
                {creating ? "생성 중…" : "발급"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 키 목록 */}
        <Card>
          <CardHeader>
            <CardTitle>발급된 키</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">불러오는 중…</p>
            ) : keys.length === 0 ? (
              <p className="text-sm text-muted-foreground">아직 키가 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {keys.map((k) => (
                  <div
                    key={k.id}
                    className="flex items-center justify-between gap-3 p-3 border rounded-md"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{k.name}</span>
                        {k.revoked_at && (
                          <Badge variant="destructive">취소됨</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">
                        {k.prefix}…
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        마지막 사용:{" "}
                        {k.last_used_at
                          ? new Date(k.last_used_at).toLocaleString("ko-KR")
                          : "—"}
                      </p>
                    </div>
                    {!k.revoked_at && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRevoke(k.id)}
                        title="키 취소"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
