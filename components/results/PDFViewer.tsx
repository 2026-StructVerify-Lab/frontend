"use client";

// components/results/PDFViewer.tsx
//
// react-pdf 기반 PDF 뷰어 + verdict 하이라이트 overlay.
//
// 핵심 동작:
//   1. PDF 페이지 캔버스 렌더링
//   2. text layer 위에 빨강/노랑/회색 하이라이트 박스 그림 (claim.pdf_locations 기준)
//   3. 하이라이트 클릭 → onClaimClick(sent_id) → 우측 카드로 스크롤
//   4. 우측 카드에서 호버/포커스 → focusedClaimId prop → 해당 하이라이트만 진하게
//
// 백엔드가 PDF 좌표를 안 보내주면 (pdf_locations=undefined) 하이라이트 없이
// PDF만 렌더 — 단순 viewer로 폴백.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ClaimResult } from "@/lib/types";

// react-pdf v9는 worker를 명시적으로 지정해야 함.
// cdn 사용 — production에서는 self-host 권장.
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

// react-pdf 기본 CSS 임포트 (text layer)
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

interface PDFViewerProps {
  /** 업로드된 PDF의 URL — 보통 백엔드 signed URL */
  fileUrl: string;
  /** claim 결과 — pdf_locations가 있으면 하이라이트 표시 */
  claims: ClaimResult[];
  /** 카드에서 호버/클릭된 claim — 해당 하이라이트만 강조 */
  focusedClaimId?: string | null;
  /** 하이라이트 클릭 시 부모에게 알림 (우측 카드 스크롤 트리거) */
  onClaimClick?: (sentId: string) => void;
}

export function PDFViewer({
  fileUrl,
  claims,
  focusedClaimId,
  onClaimClick,
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(null);

  // 현재 페이지에 해당하는 하이라이트만 추출
  const highlightsOnPage = useMemo(() => {
    return claims.flatMap((c) =>
      (c.pdf_locations ?? [])
        .filter((loc) => loc.page === pageNumber)
        .map((loc) => ({
          claim: c,
          bbox: loc.bbox,
          text: loc.text,
        }))
    );
  }, [claims, pageNumber]);

  // focused 하이라이트가 다른 페이지면 자동 이동
  useEffect(() => {
    if (!focusedClaimId) return;
    const claim = claims.find((c) => c.sent_id === focusedClaimId);
    const loc = claim?.pdf_locations?.[0];
    if (loc && loc.page !== pageNumber) {
      setPageNumber(loc.page);
    }
  }, [focusedClaimId, claims, pageNumber]);

  const onDocLoad = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  }, []);

  const onPageLoad = useCallback(
    (page: any) => {
      // page.originalWidth / originalHeight 가져와서 overlay 좌표 매핑
      setPageSize({
        width: page.originalWidth * scale,
        height: page.originalHeight * scale,
      });
    },
    [scale]
  );

  return (
    <div className="flex flex-col h-full bg-muted/30 rounded-lg overflow-hidden">
      {/* 툴바 */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-background">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPageNumber((n) => Math.max(1, n - 1))}
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm tabular-nums">
            {pageNumber} / {numPages || "?"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPageNumber((n) => Math.min(numPages, n + 1))}
            disabled={pageNumber >= numPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm tabular-nums w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button variant="ghost" size="icon" onClick={() => setScale((s) => Math.min(2.5, s + 0.1))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF 영역 */}
      <div className="flex-1 overflow-auto flex justify-center p-4">
        <div className="relative inline-block shadow-lg">
          <Document
            file={fileUrl}
            onLoadSuccess={onDocLoad}
            loading={
              <div className="p-8 text-muted-foreground">PDF 불러오는 중…</div>
            }
            error={
              <div className="p-8 text-destructive">
                PDF를 불러올 수 없습니다.
              </div>
            }
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              onLoadSuccess={onPageLoad}
              renderTextLayer
              renderAnnotationLayer={false}
            />
          </Document>

          {/* 하이라이트 overlay — Page와 같은 부모 안에 absolute */}
          {pageSize &&
            highlightsOnPage.map(({ claim, bbox, text }, i) => {
              // bbox는 PDF 원본 좌표 — scale 적용 필요
              const left = bbox.x * scale;
              const top = bbox.y * scale;
              const width = bbox.w * scale;
              const height = bbox.h * scale;
              return (
                <button
                  key={`${claim.sent_id}-${i}`}
                  className={cn(
                    "pdf-highlight",
                    claim.verdict,
                    focusedClaimId === claim.sent_id && "focused"
                  )}
                  style={{ left, top, width, height }}
                  onClick={() => onClaimClick?.(claim.sent_id)}
                  title={text}
                />
              );
            })}
        </div>
      </div>
    </div>
  );
}
