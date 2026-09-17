import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Header, Footer, Countdown } from "@/components/site";
import { API_BASE } from "@/lib/queryClient";
import { CANDIDATE_GROUPS, FIELDS, FILE_SLOTS, NOMINATOR_TYPES } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Download, FileUp, Loader2, Trash2 } from "lucide-react";

type Form = Record<string, string>;

type DupItem = {
  id: number;
  code: string;
  fullName: string;
  nominatorName: string;
  createdAt: string;
  reason: string;
};

const TEMPLATES: Record<string, string> = {
  mau_m2: "./mau/Mau-M2-trich-ngang-ly-lich.doc",
  bao_cao: "./mau/Mau-bao-cao-thanh-tich.doc",
};

const STEPS = ["Đơn vị đề cử", "Cá nhân được giới thiệu", "Thành phần hồ sơ", "Xác nhận"];

function Field({
  label,
  required,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function Register() {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Form>({
    nominatorType: "",
    nominatorName: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    fullName: "",
    dob: "",
    gender: "",
    ethnicity: "",
    religion: "",
    residence: "",
    workplace: "",
    position: "",
    candidatePhone: "",
    candidateEmail: "",
    candidateGroup: "",
    field: "",
    summary: "",
  });
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [dup, setDup] = useState<{ message: string; items: DupItem[] } | null>(null);

  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  const addFiles = (slot: string, list: FileList | null, max: number) => {
    if (!list) return;
    const picked = Array.from(list);
    if (!picked.length) return;
    setFiles((s) => {
      const next = [...(s[slot] || []), ...picked].slice(0, max);
      return { ...s, [slot]: next };
    });
  };

  const removeFile = (slot: string, idx: number) =>
    setFiles((s) => ({ ...s, [slot]: (s[slot] || []).filter((_, i) => i !== idx) }));

  const stepErrors = (i: number): string[] => {
    const e: string[] = [];
    if (i === 0) {
      if (!f.nominatorType) e.push("Chọn loại đơn vị đề cử");
      if (!f.nominatorName.trim()) e.push("Nhập tên đơn vị đề cử");
      if (!f.contactName.trim()) e.push("Nhập họ tên người liên hệ");
      if (!/^[0-9+\s.]{8,}$/.test(f.contactPhone)) e.push("Số điện thoại liên hệ chưa hợp lệ");
      if (!/^\S+@\S+\.\S+$/.test(f.contactEmail)) e.push("Email liên hệ chưa hợp lệ");
    }
    if (i === 1) {
      if (!f.fullName.trim()) e.push("Nhập họ và tên cá nhân được giới thiệu");
      if (!f.dob) e.push("Chọn ngày tháng năm sinh");
      if (!f.candidateGroup) e.push("Chọn nhóm đối tượng");
      if (!f.field) e.push("Chọn lĩnh vực đề cử");
    }
    if (i === 2) {
      for (const s of FILE_SLOTS) {
        const n = (files[s.key] || []).length;
        if (s.required && n === 0) e.push(`Thiếu: ${s.label}`);
        if ("min" in s && s.min && n > 0 && n < s.min) e.push(`${s.label}: cần tối thiểu ${s.min} tệp`);
      }
    }
    return e;
  };

  const next = () => {
    const e = stepErrors(step);
    if (e.length) {
      toast({ title: "Vui lòng hoàn thiện thông tin", description: e.join(" · "), variant: "destructive" });
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (confirmDuplicate = false) => {
    const e = [0, 1, 2].flatMap(stepErrors);
    if (e.length) {
      toast({ title: "Hồ sơ chưa hợp lệ", description: e.join(" · "), variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(f).forEach(([k, v]) => fd.append(k, v));
      if (confirmDuplicate) fd.append("confirmDuplicate", "1");
      Object.entries(files).forEach(([slot, list]) => list.forEach((file) => fd.append(slot, file)));
      const res = await fetch(`${API_BASE}/api/nominations`, { method: "POST", body: fd });
      if (res.status === 409) {
        const d = await res.json();
        setDup({ message: d.message || "Hồ sơ có dấu hiệu trùng", items: d.duplicate || [] });
        setSubmitting(false);
        return;
      }
      if (!res.ok) throw new Error((await res.json()).message || "Gửi hồ sơ thất bại");
      const data = await res.json();
      setDup(null);
      setDone(data.code);
      window.scrollTo({ top: 0 });
    } catch (err: any) {
      toast({ title: "Không gửi được hồ sơ", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const age = (() => {
    if (!f.dob) return null;
    const d = new Date(f.dob);
    if (isNaN(d.getTime())) return null;
    const ref = new Date("2026-12-31");
    let a = ref.getFullYear() - d.getFullYear();
    const m = ref.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && ref.getDate() < d.getDate())) a--;
    return a;
  })();

  const ageWarning =
    age == null
      ? null
      : f.candidateGroup === "can_bo_hoi"
        ? age < 23 || age > 40
          ? "Cán bộ Hội: độ tuổi từ 23 đến 35, trường hợp đặc biệt không quá 40 tuổi."
          : null
        : f.candidateGroup === "hoi_vien" && (age < 16 || age > 30)
          ? "Hội viên, thanh niên: độ tuổi từ 16 đến không quá 30 tuổi."
          : null;

  if (done) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-2xl px-5 py-24 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />
          <h1 className="font-display mt-6 text-3xl font-bold tracking-tight">Đã tiếp nhận hồ sơ</h1>
          <p className="mt-3 text-muted-foreground">
            Hồ sơ giới thiệu cá nhân <strong>{f.fullName}</strong> đã được gửi tới Văn phòng Trung ương Hội LHTN Việt
            Nam. Mã hồ sơ của bạn:
          </p>
          <div className="font-display mt-5 inline-block rounded-lg border border-card-border bg-card px-6 py-3 text-2xl font-bold text-primary" data-testid="text-code">
            {done}
          </div>
          <p className="mt-5 text-sm text-muted-foreground">
            Hệ thống đang tự động bóc tách và tổng hợp nội dung hồ sơ để phục vụ công tác thẩm định. Vui lòng lưu lại mã
            hồ sơ để tra cứu khi cần.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/">
              <Button variant="outline" data-testid="button-back-home">Về trang chủ</Button>
            </Link>
            <Button
              onClick={() => {
                setDone(null);
                setStep(0);
                setFiles({});
              }}
              data-testid="button-new-nomination"
            >
              Nộp hồ sơ khác
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-3xl px-5 py-12">
        <h1 className="font-display text-3xl font-bold tracking-tight">Nộp hồ sơ trực tuyến</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Giải thưởng “Thanh niên sống đẹp” năm 2026 · Hạn nhận hồ sơ: 23h59 ngày 30/9/2026 (giờ Việt Nam)
        </p>

        <div className="mt-6">
          <Countdown />
        </div>

        {/* Steps */}
        <ol className="mt-8 grid grid-cols-4 gap-2">
          {STEPS.map((s, i) => (
            <li key={s} className="space-y-2">
              <div className={`h-1 rounded-full ${i <= step ? "bg-primary" : "bg-border"}`} />
              <div className={`text-[11px] leading-tight ${i <= step ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                {s}
              </div>
            </li>
          ))}
        </ol>

        <Card className="mt-8 border-card-border p-6 md:p-8">
          {step === 0 && (
            <div className="space-y-6">
              <Field label="Đơn vị đề cử, giới thiệu" required>
                <Select value={f.nominatorType} onValueChange={(v) => set("nominatorType", v)}>
                  <SelectTrigger data-testid="select-nominator-type">
                    <SelectValue placeholder="Chọn loại đơn vị đề cử" />
                  </SelectTrigger>
                  <SelectContent>
                    {NOMINATOR_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Tên đầy đủ của đơn vị đề cử" required hint="Ví dụ: Hội LHTN Việt Nam thành phố Hà Nội">
                <Input value={f.nominatorName} onChange={(e) => set("nominatorName", e.target.value)} data-testid="input-nominator-name" />
              </Field>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Người liên hệ" required>
                  <Input value={f.contactName} onChange={(e) => set("contactName", e.target.value)} data-testid="input-contact-name" />
                </Field>
                <Field label="Điện thoại liên hệ" required>
                  <Input value={f.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} data-testid="input-contact-phone" />
                </Field>
              </div>
              <Field label="Email liên hệ" required hint="Hệ thống gửi thông báo tiếp nhận hồ sơ qua địa chỉ này.">
                <Input type="email" value={f.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} data-testid="input-contact-email" />
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Họ và tên" required>
                  <Input value={f.fullName} onChange={(e) => set("fullName", e.target.value)} data-testid="input-full-name" />
                </Field>
                <Field label="Ngày tháng năm sinh" required hint={age != null ? `Tuổi tính đến 31/12/2026: ${age}` : undefined}>
                  <Input type="date" value={f.dob} onChange={(e) => set("dob", e.target.value)} data-testid="input-dob" />
                </Field>
              </div>
              <div className="grid gap-5 md:grid-cols-3">
                <Field label="Giới tính">
                  <Select value={f.gender} onValueChange={(v) => set("gender", v)}>
                    <SelectTrigger data-testid="select-gender">
                      <SelectValue placeholder="Chọn" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Nam">Nam</SelectItem>
                      <SelectItem value="Nữ">Nữ</SelectItem>
                      <SelectItem value="Khác">Khác</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Dân tộc">
                  <Input value={f.ethnicity} onChange={(e) => set("ethnicity", e.target.value)} data-testid="input-ethnicity" />
                </Field>
                <Field label="Tôn giáo">
                  <Input value={f.religion} onChange={(e) => set("religion", e.target.value)} data-testid="input-religion" />
                </Field>
              </div>
              <Field label="Nơi thường trú">
                <Input value={f.residence} onChange={(e) => set("residence", e.target.value)} data-testid="input-residence" />
              </Field>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Nơi công tác / học tập">
                  <Input value={f.workplace} onChange={(e) => set("workplace", e.target.value)} data-testid="input-workplace" />
                </Field>
                <Field label="Chức vụ công tác">
                  <Input value={f.position} onChange={(e) => set("position", e.target.value)} data-testid="input-position" />
                </Field>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Điện thoại cá nhân">
                  <Input value={f.candidatePhone} onChange={(e) => set("candidatePhone", e.target.value)} data-testid="input-candidate-phone" />
                </Field>
                <Field label="Email cá nhân">
                  <Input value={f.candidateEmail} onChange={(e) => set("candidateEmail", e.target.value)} data-testid="input-candidate-email" />
                </Field>
              </div>
              <Field label="Nhóm đối tượng" required>
                <Select value={f.candidateGroup} onValueChange={(v) => set("candidateGroup", v)}>
                  <SelectTrigger data-testid="select-group">
                    <SelectValue placeholder="Chọn nhóm đối tượng" />
                  </SelectTrigger>
                  <SelectContent>
                    {CANDIDATE_GROUPS.map((g) => (
                      <SelectItem key={g.value} value={g.value}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {ageWarning && (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" data-testid="text-age-warning">
                  Lưu ý: {ageWarning} Hồ sơ vẫn có thể gửi và sẽ do Hội đồng xem xét.
                </p>
              )}
              <Field label="Lĩnh vực đề cử" required>
                <Select value={f.field} onValueChange={(v) => set("field", v)}>
                  <SelectTrigger data-testid="select-field">
                    <SelectValue placeholder="Chọn lĩnh vực" />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELDS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Tóm tắt thành tích nổi bật" hint="Tối đa khoảng 300 từ. Hệ thống sẽ đối chiếu với tài liệu đính kèm.">
                <Textarea rows={5} value={f.summary} onChange={(e) => set("summary", e.target.value)} data-testid="input-summary" />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              {FILE_SLOTS.map((s) => {
                const list = files[s.key] || [];
                return (
                  <div key={s.key} className="rounded-lg border border-card-border p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold">{s.label}</h3>
                          {s.required ? (
                            <Badge variant="secondary" className="text-[11px]">Bắt buộc</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[11px]">Nếu có</Badge>
                          )}
                          <span className="text-[11px] text-muted-foreground">
                            {list.length}/{s.max} tệp
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
                      </div>
                      <div className="flex gap-2">
                        {TEMPLATES[s.key] && (
                          <a href={TEMPLATES[s.key]} download>
                            <Button type="button" variant="outline" size="sm" data-testid={`link-form-${s.key}`}>
                              <Download className="mr-2 h-4 w-4" />
                              Tải mẫu
                            </Button>
                          </a>
                        )}
                        <label>
                          <input
                            type="file"
                            multiple={s.max > 1}
                            className="hidden"
                            data-testid={`input-file-${s.key}`}
                            onChange={(e) => {
                              addFiles(s.key, e.target.files, s.max);
                              e.target.value = "";
                            }}
                          />
                          <Button type="button" size="sm" asChild>
                            <span className="cursor-pointer">
                              <FileUp className="mr-2 h-4 w-4" />
                              Chọn tệp
                            </span>
                          </Button>
                        </label>
                      </div>
                    </div>
                    {list.length > 0 && (
                      <ul className="mt-4 space-y-2">
                        {list.map((file, i) => (
                          <li
                            key={i}
                            className="flex items-center gap-3 rounded-md bg-secondary/60 px-3 py-2 text-xs"
                            data-testid={`item-file-${s.key}-${i}`}
                          >
                            <span className="min-w-0 flex-1 truncate">{file.name}</span>
                            <span className="shrink-0 text-muted-foreground">{file.size < 1024 * 1024 ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `${(file.size / 1024 / 1024).toFixed(1)} MB`}</span>
                            <button
                              type="button"
                              onClick={() => removeFile(s.key, i)}
                              className="shrink-0 text-muted-foreground hover:text-destructive"
                              data-testid={`button-remove-${s.key}-${i}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground">
                Định dạng khuyến nghị: PDF, DOC/DOCX, JPG, PNG. Dung lượng mỗi tệp tối đa 25 MB.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-base font-semibold">Kiểm tra lại thông tin trước khi gửi</h2>
              <dl className="grid gap-x-6 gap-y-3 text-sm md:grid-cols-2">
                {[
                  ["Đơn vị đề cử", `${f.nominatorName} (${f.nominatorType})`],
                  ["Người liên hệ", `${f.contactName} · ${f.contactPhone} · ${f.contactEmail}`],
                  ["Họ và tên", f.fullName],
                  ["Ngày sinh", `${f.dob.split("-").reverse().join("/")}${age != null ? ` · tuổi đến 31/12/2026: ${age}` : ""}`],
                  ["Nơi công tác", [f.position, f.workplace].filter(Boolean).join(" - ") || "—"],
                  ["Nhóm đối tượng", CANDIDATE_GROUPS.find((g) => g.value === f.candidateGroup)?.label || "—"],
                  ["Lĩnh vực", f.field],
                ].map(([k, v]) => (
                  <div key={k as string} className="border-b border-border pb-2">
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt>
                    <dd className="mt-1 font-medium">{v || "—"}</dd>
                  </div>
                ))}
              </dl>
              <div>
                <h3 className="text-sm font-semibold">Tệp đính kèm</h3>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {FILE_SLOTS.map((s) => (
                    <li key={s.key}>
                      {s.label}: <strong className="text-foreground">{(files[s.key] || []).length}</strong> tệp
                    </li>
                  ))}
                </ul>
              </div>
              <p className="rounded-md border border-border bg-secondary/50 p-4 text-xs leading-relaxed text-muted-foreground">
                Đơn vị đề cử chịu trách nhiệm về tính chính xác của thông tin và tài liệu đã cung cấp. Sau khi gửi, hệ
                thống sẽ tự động bóc tách nội dung tài liệu (OCR) và tổng hợp thành tích để phục vụ Hội đồng xét chọn.
              </p>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-6">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || submitting}
              data-testid="button-prev"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại
            </Button>
            {step < 3 ? (
              <Button onClick={next} data-testid="button-next">
                Tiếp tục
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={() => submit()} disabled={submitting} data-testid="button-submit">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {submitting ? "Đang gửi hồ sơ…" : "Gửi hồ sơ"}
              </Button>
            )}
          </div>
        </Card>
      </div>

      <Dialog open={!!dup} onOpenChange={(o) => !o && setDup(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Hồ sơ có dấu hiệu trùng
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-relaxed text-muted-foreground">{dup?.message}</p>
          {!!dup?.items?.length && (
            <div className="space-y-2 rounded-md border bg-muted/40 p-3 text-sm">
              {dup.items.map((d) => (
                <div key={d.id} className="leading-relaxed">
                  <span className="font-semibold">{d.code}</span> · {d.fullName} · {d.nominatorName}
                  <div className="text-xs text-muted-foreground">
                    Nhận ngày {d.createdAt?.slice(0, 10)} · Lý do: {d.reason}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-sm leading-relaxed">
            Nếu đây là hồ sơ của một cá nhân khác, bạn có thể xác nhận để gửi tiếp. Nếu chỉ muốn sửa hồ sơ đã
            nộp, xin liên hệ Văn phòng Trung ương Hội theo địa chỉ twhoilhtnvn@gmail.com kèm mã hồ sơ.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setDup(null)} data-testid="button-dup-cancel">
              Kiểm tra lại
            </Button>
            <Button
              onClick={() => {
                setDup(null);
                submit(true);
              }}
              disabled={submitting}
              data-testid="button-dup-confirm"
            >
              Đây là cá nhân khác, vẫn gửi
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
