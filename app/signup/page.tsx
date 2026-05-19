"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Languages } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { signup, setAuthToken } from "@/lib/api";
import { cn } from "@/lib/utils";

/** 한글(자모/완성형) 제거 + 한글이 있었는지 플래그 함께 반환 */
function stripKoreanWithFlag(s: string): { value: string; hadHangul: boolean } {
  const cleaned = s.replace(/[ㄱ-ㅎㅏ-ㅣ가-힣]/g, "");
  return { value: cleaned, hadHangul: cleaned !== s };
}

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 비밀번호 일치 여부 — 둘 다 1자 이상 입력했을 때만 체크
  const passwordsTouched = password.length > 0 && passwordConfirm.length > 0;
  const passwordsMatch = password === passwordConfirm;
  const showMismatch = passwordsTouched && !passwordsMatch;

  // 한글 차단 안내 — input 별로 2.5초만 표시 후 자동 dismiss
  const [emailHangulWarn, setEmailHangulWarn] = useState(false);
  const [pwHangulWarn, setPwHangulWarn] = useState(false);
  const [pwConfirmHangulWarn, setPwConfirmHangulWarn] = useState(false);

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
    if (!passwordsMatch) {
      setError("비밀번호가 서로 일치하지 않습니다.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { access_token } = await signup(email, password, tenantName);
      setAuthToken(access_token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message ?? "회원가입 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>회원가입</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenant">조직명</Label>
              <Input
                id="tenant"
                required
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                placeholder="회사명 또는 팀명"
              />
            </div>
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
                  emailHangulWarn && "border-destructive focus-visible:ring-destructive/40"
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
                minLength={8}
                value={password}
                onChange={(e) =>
                  handleEnglishOnly(e.target.value, setPassword, setPwHangulWarn)
                }
                placeholder="8자 이상"
                lang="en"
                autoComplete="new-password"
                autoCapitalize="off"
                spellCheck={false}
                aria-invalid={pwHangulWarn}
                className={cn(
                  pwHangulWarn && "border-destructive focus-visible:ring-destructive/40"
                )}
              />
              {pwHangulWarn && (
                <p className="text-xs text-destructive flex items-center gap-1 animate-in fade-in-0 slide-in-from-top-0.5">
                  <Languages className="h-3 w-3" />
                  비밀번호는 영문으로 입력해 주세요
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password-confirm">비밀번호 재확인</Label>
              <Input
                id="password-confirm"
                type="password"
                required
                minLength={8}
                value={passwordConfirm}
                onChange={(e) =>
                  handleEnglishOnly(
                    e.target.value,
                    setPasswordConfirm,
                    setPwConfirmHangulWarn
                  )
                }
                placeholder="비밀번호 한 번 더 입력"
                lang="en"
                autoComplete="new-password"
                autoCapitalize="off"
                spellCheck={false}
                aria-invalid={showMismatch || pwConfirmHangulWarn}
                className={cn(
                  (showMismatch || pwConfirmHangulWarn) &&
                    "border-destructive focus-visible:ring-destructive/40"
                )}
              />
              {pwConfirmHangulWarn && (
                <p className="text-xs text-destructive flex items-center gap-1 animate-in fade-in-0 slide-in-from-top-0.5">
                  <Languages className="h-3 w-3" />
                  비밀번호는 영문으로 입력해 주세요
                </p>
              )}
              {!pwConfirmHangulWarn && showMismatch && (
                <p className="text-xs text-destructive">
                  비밀번호가 일치하지 않습니다.
                </p>
              )}
              {!pwConfirmHangulWarn && passwordsTouched && passwordsMatch && (
                <p className="text-xs text-verdict-match">
                  비밀번호가 일치합니다.
                </p>
              )}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}

            {/* 정적 안내 — 계정 만들기 버튼 직전에 마지막 확인용으로 */}
            <div className="rounded-md bg-muted/40 px-3 py-2 text-[11.5px] text-muted-foreground flex items-center gap-2">
              <Languages className="h-3.5 w-3.5 shrink-0" />
              이메일과 비밀번호는 영문/숫자/기호로만 입력 가능해요
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !passwordsMatch}
            >
              {loading ? "생성 중…" : "계정 만들기"}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              이미 계정 있으세요?{" "}
              <Link href="/login" className="text-primary hover:underline">
                로그인
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
