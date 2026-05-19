"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Languages } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { login, setAuthToken } from "@/lib/api";
import { cn } from "@/lib/utils";

/** 한글(자모/완성형) 제거 + 한글이 있었는지 플래그 함께 반환 */
function stripKoreanWithFlag(s: string): { value: string; hadHangul: boolean } {
  const cleaned = s.replace(/[ㄱ-ㅎㅏ-ㅣ가-힣]/g, "");
  return { value: cleaned, hadHangul: cleaned !== s };
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 한글 차단 안내 — input 별로 2.5초만 표시 후 자동 dismiss
  const [emailHangulWarn, setEmailHangulWarn] = useState(false);
  const [pwHangulWarn, setPwHangulWarn] = useState(false);

  function handleEnglishOnly(
    raw: string,
    setValue: (v: string) => void,
    setWarn: (v: boolean) => void
  ) {
    const { value, hadHangul } = stripKoreanWithFlag(raw);
    setValue(value);
    if (hadHangul) {
      setWarn(true);
      setTimeout(() => setWarn(false), 2500);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { access_token } = await login(email, password);
      setAuthToken(access_token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message ?? "로그인 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>로그인</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) =>
                  handleEnglishOnly(e.target.value, setEmail, setEmailHangulWarn)
                }
                placeholder="you@example.com"
                lang="en"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="off"
                spellCheck={false}
                aria-invalid={emailHangulWarn}
                className={cn(
                  emailHangulWarn &&
                    "border-destructive focus-visible:ring-destructive/40"
                )}
              />
              {emailHangulWarn && (
                <p className="text-xs text-destructive flex items-center gap-1 animate-in fade-in-0 slide-in-from-top-0.5">
                  <Languages className="h-3 w-3" />
                  이메일은 영문으로 입력해 주세요
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) =>
                  handleEnglishOnly(e.target.value, setPassword, setPwHangulWarn)
                }
                lang="en"
                autoComplete="current-password"
                autoCapitalize="off"
                spellCheck={false}
                aria-invalid={pwHangulWarn}
                className={cn(
                  pwHangulWarn &&
                    "border-destructive focus-visible:ring-destructive/40"
                )}
              />
              {pwHangulWarn && (
                <p className="text-xs text-destructive flex items-center gap-1 animate-in fade-in-0 slide-in-from-top-0.5">
                  <Languages className="h-3 w-3" />
                  비밀번호는 영문으로 입력해 주세요
                </p>
              )}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "로그인 중…" : "로그인"}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              계정이 없으세요?{" "}
              <Link href="/signup" className="text-primary hover:underline">
                회원가입
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
