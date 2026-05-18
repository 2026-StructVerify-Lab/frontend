"use client";

// components/ui/confirm-dialog.tsx
//
// 사용자 확인이 필요한 작업(로그아웃, 삭제 등)에 쓰는 재사용 모달.
// Radix Dialog 기반 + 노션 톤.
//
// [사용]
//   const [open, setOpen] = useState(false);
//   <ConfirmDialog
//     open={open}
//     onOpenChange={setOpen}
//     title="로그아웃 하시겠습니까?"
//     description="다시 로그인해야 검증 결과에 접근할 수 있습니다."
//     confirmText="로그아웃"
//     destructive
//     onConfirm={logout}
//   />

import * as Dialog from "@radix-ui/react-dialog";

import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  /** true면 확인 버튼이 빨강(파괴적 액션) */
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "확인",
  cancelText = "취소",
  destructive,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* 오버레이 — 본문 살짝 어둡게 + 블러 */}
        <Dialog.Overlay
          className="fixed inset-0 z-50 bg-foreground/25 backdrop-blur-[1px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0"
        />
        {/* 다이얼로그 본체 — 노션 톤 카드 */}
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[400px] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-6 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95"
        >
          <Dialog.Title className="text-[16px] font-semibold tracking-tight">
            {title}
          </Dialog.Title>
          {description && (
            <Dialog.Description className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed">
              {description}
            </Dialog.Description>
          )}

          <div className="flex justify-end gap-2 mt-5">
            <Dialog.Close asChild>
              <Button variant="outline" size="sm">
                {cancelText}
              </Button>
            </Dialog.Close>
            <Button
              size="sm"
              variant={destructive ? "destructive" : "default"}
              onClick={async () => {
                await onConfirm();
                onOpenChange(false);
              }}
            >
              {confirmText}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
