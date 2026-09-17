import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header, Footer, SectionLabel, Countdown } from "@/components/site";
import { FILE_SLOTS } from "@shared/schema";
import {
  ArrowRight,
  Award,
  CalendarDays,
  Download,
  FileText,
  Heart,
  MapPin,
  Medal,
  Users,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

const PURPOSES = [
  {
    n: "01",
    title: "Tôn vinh nghĩa cử cao đẹp",
    body: "Tôn vinh những thanh niên tiêu biểu có việc làm, nghĩa cử cao đẹp, mang tính nhân văn, thể hiện tinh thần đoàn kết, tương thân tương ái, chia sẻ khó khăn với cộng đồng, xã hội.",
  },
  {
    n: "02",
    title: "Học tập và làm theo Bác",
    body: "Đẩy mạnh việc học tập và làm theo tư tưởng, đạo đức, phong cách Hồ Chí Minh; tiếp tục cụ thể hóa phong trào “Tôi yêu Tổ quốc tôi” bằng những việc làm cụ thể của thanh niên.",
  },
  {
    n: "03",
    title: "Mở rộng mặt trận đoàn kết",
    body: "Xây dựng mạng lưới những tấm gương thanh niên sống đẹp nhằm lan tỏa hành động hay, câu chuyện đẹp đến các tầng lớp, đối tượng thanh niên trên cả nước.",
  },
];

const JOURNEYS = [
  {
    month: "Tháng 8/2026",
    title:
      "Học tập, thực hành tư tưởng, đạo đức, phương pháp, phong cách Hồ Chí Minh trong giai đoạn phát triển mới",
    img: "ceremony-2",
  },
  { month: "Tháng 8/2026", title: "Tình nguyện, an sinh xã hội", img: "volunteer" },
  { month: "Tháng 8/2026", title: "Chiến đấu, bảo vệ Tổ quốc; giữ gìn an ninh trật tự, an toàn xã hội", img: "ceremony-3" },
  { month: "Tháng 9/2026", title: "Lao động sản xuất, kinh doanh, phát triển kinh tế", img: "ceremony-1" },
  { month: "Tháng 9/2026", title: "Giảng dạy, giáo dục", img: "ceremony-4" },
  { month: "Tháng 9/2026", title: "Văn hóa - nghệ thuật, thể dục - thể thao", img: "gala-crowd" },
];

const TEMPLATES: Record<string, string> = {
  mau_m2: "./mau/Mau-M2-trich-ngang-ly-lich.doc",
  bao_cao: "./mau/Mau-bao-cao-thanh-tich.doc",
};

export default function Landing() {
  const { data: counts } = useQuery<{ total: number; units: number }>({ queryKey: ["/api/nominations/count"] });

  return (
    <div className="min-h-screen bg-background">
      <Header dark />

      {/* HERO */}
      <section className="relative overflow-hidden tnsd-navy text-white">
        <img
          src="./img/bg-blue.jpg"
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#061529]/70 via-[#061529]/85 to-[#061529]" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-5 py-20 md:grid-cols-[1.15fr_.85fr] md:py-28">
          <div className="reveal">
            <Badge className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-medium tracking-wide text-white hover:bg-white/10">
              Trung ương Hội Liên hiệp Thanh niên Việt Nam
            </Badge>
            <h1 className="font-display mt-6 text-4xl font-extrabold leading-[1.12] tracking-tight md:text-5xl">
              Giải thưởng
              <br />
              <span className="tnsd-gold">“Thanh niên sống đẹp”</span>
              <br />
              năm 2026
            </h1>
            <p className="mt-3 text-sm font-semibold uppercase tracking-[0.25em] text-white/45">Noble Youth Award 2026</p>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/75">
              Tôn vinh những thanh niên có việc làm, nghĩa cử cao đẹp, mang tính nhân văn, thể hiện tinh thần đoàn kết,
              tương thân tương ái, sẻ chia khó khăn với cộng đồng và xã hội.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/dang-ky">
                <Button size="lg" className="bg-[#E9B949] text-[#061529] hover:bg-[#f2c65f]" data-testid="button-submit-hero">
                  Nộp hồ sơ trực tuyến
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="border border-white/50 bg-white/5 text-white hover:bg-white/15 hover:text-white"
                onClick={() => document.getElementById("ho-so")?.scrollIntoView({ behavior: "smooth" })}
                data-testid="button-view-dossier"
              >
                Thành phần hồ sơ
              </Button>
            </div>

            <div className="mt-10 max-w-lg">
              <Countdown dark />
            </div>

            <div className="mt-8 grid max-w-lg grid-cols-2 gap-6 border-t border-white/10 pt-6">
              {[
                { v: counts ? `${counts.total}` : "—", l: "hồ sơ đã tiếp nhận" },
                { v: counts ? `${counts.units}` : "—", l: "đơn vị đã giới thiệu" },
              ].map((s) => (
                <div key={s.l}>
                  <div className="font-display text-3xl font-bold tnsd-gold">{s.v}</div>
                  <div className="mt-1 text-xs leading-snug text-white/55">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="absolute h-64 w-64 rounded-full bg-[#E9B949]/15 blur-3xl" />
            <img
              src="./img/trophy.jpg"
              alt="Biểu trưng Giải thưởng Thanh niên sống đẹp"
              className="relative w-64 rounded-2xl object-contain md:w-80"
              style={{ mixBlendMode: "screen" }}
            />
          </div>
        </div>
      </section>

      {/* MỤC ĐÍCH */}
      <section id="muc-dich" className="mx-auto max-w-6xl px-5 py-20">
        <SectionLabel>Mục đích, ý nghĩa</SectionLabel>
        <h2 className="font-display max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">
          Lan tỏa lối sống đẹp, sống có ích trong thanh niên Việt Nam
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {PURPOSES.map((p) => (
            <Card key={p.n} className="border-card-border p-7">
              <div className="font-display text-2xl font-bold text-primary">{p.n}</div>
              <h3 className="mt-4 text-base font-semibold">{p.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ĐỐI TƯỢNG */}
      <section id="doi-tuong" className="border-y border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <SectionLabel>Đối tượng xét trao</SectionLabel>
          <div className="grid gap-10 md:grid-cols-[1fr_1fr]">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Ai được giới thiệu xét giải?</h2>
              <div className="mt-8 space-y-4">
                {[
                  {
                    icon: Users,
                    title: "Hội viên, thanh niên Việt Nam",
                    body: "Trong và ngoài nước, có độ tuổi từ 16 tuổi đến không quá 30 tuổi.",
                  },
                  {
                    icon: ShieldCheck,
                    title: "Cán bộ Hội LHTN Việt Nam",
                    body: "Chuyên trách và không chuyên trách, độ tuổi từ 23 đến 35 tuổi; trường hợp đặc biệt không quá 40 tuổi do Hội đồng xem xét, quyết định.",
                  },
                ].map((g) => (
                  <Card key={g.title} className="flex gap-4 border-card-border p-6">
                    <g.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <h3 className="text-base font-semibold">{g.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{g.body}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
            <div className="space-y-4 md:pt-20">
              {[
                "Các cá nhân đã nhận Giải thưởng những năm trước vẫn tiếp tục được xét trao nếu hồ sơ giới thiệu bảo đảm các tiêu chuẩn theo quy định.",
                "Các cá nhân được khen thưởng đặc biệt, đột xuất do có thành tích, hoạt động được các cơ quan, tổ chức, xã hội ghi nhận, để lại dấu ấn trong thanh niên, người dân và các cơ quan truyền thông, báo chí.",
                "Cá nhân có ít nhất 02 năm gần nhất (2024, 2025) được nhận hình thức khen thưởng, trong đó ít nhất 01 năm được khen thưởng của Hội cấp trên trực tiếp.",
              ].map((t) => (
                <div key={t} className="flex gap-3 rounded-lg border border-card-border bg-card p-5">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#B98B10] dark:text-[#E9B949]" />
                  <p className="text-sm leading-relaxed text-muted-foreground">{t}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HỒ SƠ */}
      <section id="ho-so" className="mx-auto max-w-6xl px-5 py-20">
        <SectionLabel>Thành phần hồ sơ</SectionLabel>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display max-w-xl text-3xl font-bold tracking-tight md:text-4xl">
            Hồ sơ đề nghị xét trao giải thưởng
          </h2>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            Hồ sơ bản mềm gửi về Văn phòng Trung ương Hội LHTN Việt Nam trước 23h59 ngày 30/9/2026 (giờ Việt Nam) qua hệ
            thống trực tuyến này hoặc email twhoilhtnvn@gmail.com.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {FILE_SLOTS.map((s, i) => (
            <Card key={s.key} className="flex gap-4 border-card-border p-6">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold">{s.label}</h3>
                  {!s.required && <Badge variant="secondary" className="text-[11px]">Nếu có</Badge>}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.hint}</p>
                {TEMPLATES[s.key] && (
                  <a
                    href={TEMPLATES[s.key]}
                    download
                    className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    data-testid={`link-template-${s.key}`}
                  >
                    <Download className="h-4 w-4" />
                    Tải mẫu tại đây
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>

        <Card className="mt-6 flex flex-col gap-4 border-card-border bg-primary/5 p-6 md:flex-row md:items-center">
          <FileText className="h-6 w-6 shrink-0 text-primary" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Đơn vị đề cử gồm: Ban Thư ký Hội LHTN Việt Nam các tỉnh, thành phố và đơn vị trực thuộc; Ban Thanh niên Công
            an Nhân dân; Ban Thanh niên Quân đội; Đoàn Thanh niên Chính phủ; Đoàn Thanh niên các cơ quan Đảng Trung ương;
            Đoàn Thanh niên MTTQ, các đoàn thể Trung ương; Đoàn Thanh niên Quốc hội; các cơ quan thông tấn, báo chí của
            Đoàn, Hội.
          </p>
          <Link href="/dang-ky">
            <Button className="shrink-0" data-testid="button-submit-dossier">
              Bắt đầu nộp hồ sơ
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </Card>
      </section>

      {/* HÀNH TRÌNH */}
      <section id="hanh-trinh" className="tnsd-navy text-white">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <SectionLabel>Hành trình Thanh niên sống đẹp</SectionLabel>
          <h2 className="font-display max-w-2xl text-3xl font-bold tracking-tight text-white md:text-4xl">
            Sáu hành trình trên khắp cả nước, khép lại bằng Gala tháng 10/2026
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {JOURNEYS.map((j) => (
              <article key={j.title} className="group overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
                <div className="relative h-36 overflow-hidden">
                  <img
                    src={`./img/${j.img}.jpg`}
                    alt=""
                    className="h-full w-full object-cover opacity-70 transition duration-500 group-hover:scale-105 group-hover:opacity-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#061529] via-[#061529]/30 to-transparent" />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#E9B949]">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {j.month}
                  </div>
                  <h3 className="mt-2 text-sm font-semibold leading-snug text-white">{j.title}</h3>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-8 grid gap-4 rounded-xl border border-white/10 bg-white/[0.04] p-7 md:grid-cols-[1fr_1.2fr] md:items-center">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#E9B949]">
                <CalendarDays className="h-3.5 w-3.5" />
                Tháng 10/2026
              </div>
              <h3 className="font-display mt-2 text-2xl font-bold text-white">Chương trình Gala Thanh niên sống đẹp</h3>
            </div>
            <ul className="grid gap-2 text-sm text-white/70">
              {[
                "Chương trình nghệ thuật mở màn",
                "Phóng sự “Thanh niên sống đẹp 2026”",
                "Phát biểu của Thường trực Đoàn Chủ tịch Ủy ban Trung ương Hội LHTN Việt Nam",
                "Giao lưu với các gương “Thanh niên sống đẹp” tiêu biểu",
                "Lễ trao Giải thưởng “Thanh niên sống đẹp” năm 2026",
              ].map((x) => (
                <li key={x} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#E9B949]" />
                  {x}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* GIẢI THƯỞNG */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <SectionLabel>Cơ cấu giải thưởng</SectionLabel>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { icon: Award, t: "Biểu trưng Giải thưởng", b: "Biểu trưng “Thanh niên sống đẹp” và phần thưởng tiền mặt." },
            { icon: Medal, t: "Bằng khen", b: "Bằng khen của Trung ương Hội Liên hiệp Thanh niên Việt Nam." },
            { icon: Heart, t: "Giấy chứng nhận", b: "Giấy chứng nhận Giải thưởng “Thanh niên sống đẹp” năm 2026." },
          ].map((x) => (
            <Card key={x.t} className="border-card-border p-7">
              <x.icon className="h-6 w-6 text-[#B98B10] dark:text-[#E9B949]" />
              <h3 className="mt-4 text-base font-semibold">{x.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{x.b}</p>
            </Card>
          ))}
        </div>

        <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { img: "gala-2024", pos: "50% 35%" },
            { img: "vinh-danh", pos: "50% 40%" },
            { img: "gala-stage", pos: "50% 12%" },
            { img: "stage-wide", pos: "50% 45%" },
          ].map(({ img, pos }) => (
            <img
              key={img}
              src={`./img/${img}.jpg`}
              alt="Hình ảnh các mùa giải trước"
              className="h-40 w-full rounded-lg object-cover"
              style={{ objectPosition: pos }}
            />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-secondary/40">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-16 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
              Giới thiệu tấm gương thanh niên sống đẹp của đơn vị bạn
            </h2>
            <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              Văn phòng Trung ương Hội LHTN Việt Nam · 62 Bà Triệu, phường Cửa Nam, Hà Nội
            </p>
          </div>
          <Link href="/dang-ky">
            <Button size="lg" data-testid="button-submit-cta">
              Nộp hồ sơ trực tuyến
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
