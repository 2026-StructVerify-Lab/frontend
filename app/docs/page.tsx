import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/ui/card";

export default function DocsPage() {
  return (
    <AppShell>
      <div className="container max-w-3xl py-8 space-y-6">
        <h1 className="text-2xl font-semibold">API 문서</h1>
        <Card>
          <CardContent className="p-6 space-y-4 text-sm">
            <section>
              <h2 className="font-semibold mb-2">인증</h2>
              <p className="text-muted-foreground">
                모든 요청은 <code>Authorization: Bearer YOUR_API_KEY</code> 헤더 필요.
              </p>
            </section>
            <section>
              <h2 className="font-semibold mb-2">검증 제출</h2>
              <pre className="bg-muted p-3 rounded text-xs overflow-auto">
{`POST /v1/verify
{
  "source_type": "text" | "pdf" | "docx" | "url",
  "source_data": "...",
  "datasources": ["kosis"],
  "callback_url": "https://..."  // 선택
}

→ { "job_id": "uuid", "status": "pending" }`}
              </pre>
            </section>
            <section>
              <h2 className="font-semibold mb-2">결과 조회</h2>
              <pre className="bg-muted p-3 rounded text-xs overflow-auto">
{`GET /v1/jobs/{id}

→ { "id": "uuid", "status": "completed", "result": { ... } }`}
              </pre>
            </section>
            <p className="text-muted-foreground">
              백엔드 배포 후 자동 생성된 OpenAPI는{" "}
              <code>/docs</code> (Swagger UI) 에서 확인 가능.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
