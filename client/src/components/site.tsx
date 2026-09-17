import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export const DEADLINE = new Date("2026-09-30T23:59:59+07:00");
export const DEADLINE_LABEL = "23h59 ngày 30/9/2026";

export function Logo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <img
      src="./img/logo-hlhtn.png"
      alt="Biểu trưng Hội Liên hiệp Thanh niên Việt Nam"
      className={`${className} rounded-full bg-white object-contain p-[2px]`}
    />
  );
}

function useTimeLeft() {
  const [left, setLeft] = useState(() => DEADLINE.getTime() - Date.now());
  useEffect(() => {
    const t = setInterval(() => setLeft(DEADLINE.getTime() - Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ms = Math.max(left, 0);
  return {
    expired: left <= 0,
    days: Math.floor(ms / 86400000),
    hours: Math.floor((ms % 86400000) / 3600000),
    minutes: Math.floor((ms % 3600000) / 60000),
    seconds: Math.floor((ms % 60000) / 1000),
  };
}

/** Đồng hồ đếm ngược tới hạn nộp hồ sơ, mốc cố định theo giờ Việt Nam. */
export function Countdown({ dark = false, compact = false }: { dark?: boolean; compact?: boolean }) {
  const t = useTimeLeft();
  const pad = (n: number) => String(n).padStart(2, "0");
  const items = [
    [String(t.days), "ngày"],
    [pad(t.hours), "giờ"],
    [pad(t.minutes), "phút"],
    [pad(t.seconds), "giây"],
  ] as const;

  if (t.expired) {
    return (
      <div
        className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
          dark ? "border-white/15 bg-white/5 text-white/80" : "border-border bg-secondary/50 text-foreground"
        }`}
        data-testid="text-countdown-expired"
      >
        Đã hết hạn nhận hồ sơ ({DEADLINE_LABEL}, giờ Việt Nam).
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border ${compact ? "px-4 py-3" : "px-5 py-4"} ${
        dark ? "border-white/15 bg-white/[0.06]" : "border-card-border bg-secondary/40"
      }`}
      data-testid="countdown"
    >
      <div className={`text-[11px] font-medium uppercase tracking-[0.18em] ${dark ? "text-white/55" : "text-muted-foreground"}`}>
        Còn lại tới hạn nộp hồ sơ · {DEADLINE_LABEL} (giờ Việt Nam)
      </div>
      <div className="mt-2 flex items-end gap-3" aria-live="polite">
        {items.map(([v, l], i) => (
          <div key={l} className="flex items-end gap-3">
            <div className="text-center">
              <div
                className={`font-display tabular-nums font-bold ${compact ? "text-2xl" : "text-3xl"} ${
                  dark ? "tnsd-gold" : "text-primary"
                }`}
                data-testid={`text-countdown-${l}`}
              >
                {v}
              </div>
              <div className={`mt-0.5 text-[11px] ${dark ? "text-white/55" : "text-muted-foreground"}`}>{l}</div>
            </div>
            {i < items.length - 1 && (
              <div className={`pb-5 text-xl font-bold ${dark ? "text-white/25" : "text-muted-foreground/40"}`}>:</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Header({ dark = false }: { dark?: boolean }) {
  const nav = [
    ["Mục đích", "muc-dich"],
    ["Đối tượng", "doi-tuong"],
    ["Hồ sơ", "ho-so"],
    ["Hành trình", "hanh-trinh"],
  ];
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  return (
    <header
      className={`sticky top-0 z-50 backdrop-blur-sm border-b ${
        dark ? "bg-[#061529]/85 border-white/10 text-white" : "bg-background/90 border-border"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-5">
        <Link href="/" className="flex min-w-0 items-center gap-3" data-testid="link-home">
          <Logo className={`${dark ? "text-white" : "text-primary"} h-8 w-8 shrink-0`} />
          <div className="min-w-0 leading-tight">
            <div className="whitespace-nowrap text-[12px] font-bold tracking-tight sm:text-sm">
              Thanh niên sống đẹp<span className="hidden sm:inline"> 2026</span>
            </div>
            <div className={`hidden truncate text-[11px] sm:block ${dark ? "text-white/55" : "text-muted-foreground"}`}>
              Trung ương Hội LHTN Việt Nam
            </div>
          </div>
        </Link>
        <nav className="ml-auto hidden items-center gap-1 md:flex">
          {nav.map(([label, id]) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              data-testid={`button-nav-${id}`}
              className={`rounded-md px-3 py-2 text-sm transition-colors ${
                dark ? "text-white/75 hover:text-white hover:bg-white/10" : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <Link href="/admin">
            <Button
              variant="ghost"
              size="sm"
              className={dark ? "text-white/70 hover:text-white hover:bg-white/10" : ""}
              data-testid="button-admin"
            >
              Quản trị
            </Button>
          </Link>
          <Link href="/dang-ky">
            <Button size="sm" className="bg-[#E9B949] text-[#061529] hover:bg-[#f2c65f]" data-testid="button-submit-header">
              Nộp hồ sơ
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="tnsd-navy text-white/70">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-3 text-white">
            <Logo className="h-9 w-9 text-white" />
            <div className="text-base font-bold leading-tight">
              Giải thưởng
              <br />
              “Thanh niên sống đẹp” 2026
            </div>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed">
            Do Trung ương Hội Liên hiệp Thanh niên Việt Nam tổ chức nhằm tôn vinh những thanh niên tiêu biểu có nghĩa cử
            cao đẹp, nhân văn.
          </p>
        </div>
        <div className="text-sm">
          <div className="mb-3 font-semibold text-white">Cơ quan thường trực</div>
          <p className="leading-relaxed">
            Văn phòng Trung ương Hội Liên hiệp Thanh niên Việt Nam
            <br />
            62 Bà Triệu, phường Cửa Nam, thành phố Hà Nội
            <br />
            Email: twhoilhtnvn@gmail.com
          </p>
        </div>
        <div className="text-sm">
          <div className="mb-3 font-semibold text-white">Thời hạn nhận hồ sơ</div>
          <p className="leading-relaxed">
            Hồ sơ bản mềm gửi trước <span className="tnsd-gold font-semibold">23h59 ngày 30/9/2026</span> (giờ Việt Nam)
            qua hệ thống trực tuyến này hoặc email của Văn phòng Trung ương Hội.
          </p>
          <div className="mt-4">
            <Countdown dark compact />
          </div>
          <Link href="/dang-ky">
            <Button className="mt-4 bg-[#E9B949] text-[#061529] hover:bg-[#f2c65f]" data-testid="button-submit-footer">
              Nộp hồ sơ trực tuyến
            </Button>
          </Link>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-white/45">
        <div>
          © 2026 Trung ương Hội Liên hiệp Thanh niên Việt Nam · Hệ thống tiếp nhận hồ sơ Giải thưởng “Thanh niên sống
          đẹp”
        </div>
        <div className="mt-2 flex items-center justify-center gap-3">
          <a href="/chinh-sach-bao-mat.html" className="hover:text-white/80" data-testid="link-privacy">
            Chính sách bảo mật
          </a>
          <span className="text-white/25">·</span>
          <a href="/dieu-khoan-su-dung.html" className="hover:text-white/80" data-testid="link-terms">
            Điều khoản sử dụng
          </a>
        </div>
      </div>
    </footer>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className="h-px w-8 bg-[#E9B949]" />
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B98B10] dark:text-[#E9B949]">
        {children}
      </span>
    </div>
  );
}
