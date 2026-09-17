import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="mb-3 flex items-center gap-2">
            <AlertCircle className="h-7 w-7 text-red-500" />
            <h1 className="text-xl font-bold text-slate-900">Không tìm thấy trang</h1>
          </div>
          <p className="text-sm leading-relaxed text-slate-600">
            Đường dẫn bạn truy cập không tồn tại hoặc đã thay đổi. Vui lòng quay lại trang chủ của hệ thống tiếp nhận hồ
            sơ Giải thưởng “Thanh niên sống đẹp”.
          </p>
          <Link href="/">
            <Button className="mt-5" data-testid="button-home">
              Về trang chủ
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
