import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="font-semibold text-lg">
            Structverify
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost">로그인</Button>
            </Link>
            <Link href="/signup">
              <Button>시작하기</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex items-center">
        <div className="container max-w-3xl mx-auto text-center space-y-6 py-20">
          <h1 className="text-5xl font-bold tracking-tight">
            한국 뉴스 수치, 자동 검증
          </h1>
          <p className="text-xl text-muted-foreground">
            기사 본문의 통계 주장을 KOSIS 같은 공식 데이터와 자동으로 대조합니다.
            <br />
            텍스트·PDF·URL 모두 지원하고, 회사 데이터도 연결 가능합니다.
          </p>
          <div className="flex justify-center gap-3 pt-4">
            <Link href="/signup">
              <Button size="lg">무료로 시작</Button>
            </Link>
            <Link href="/docs">
              <Button size="lg" variant="outline">
                API 문서
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
