import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, API_BASE } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/site";
import { FIELDS } from "@shared/schema";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Building2,
  Download,
  FileCheck2,
  FileText,
  Files,
  FolderSync,
  HardDrive,
  Loader2,
  ExternalLink,
  LogOut,
  RefreshCw,
  Search,
  Sparkles,
  Pencil,
  Trash2,
  Copy,
  Users,
} from "lucide-react";

const EDIT_FIELDS: { key: string; label: string; type?: "date" | "textarea" | "select"; options?: string[] }[] = [
  { key: "nominatorName", label: "Đơn vị đề cử" },
  { key: "contactName", label: "Người liên hệ" },
  { key: "contactPhone", label: "Điện thoại liên hệ" },
  { key: "contactEmail", label: "Thư điện tử liên hệ" },
  { key: "fullName", label: "Họ và tên" },
  { key: "dob", label: "Ngày sinh", type: "date" },
  { key: "gender", label: "Giới tính" },
  { key: "ethnicity", label: "Dân tộc" },
  { key: "religion", label: "Tôn giáo" },
  { key: "residence", label: "Nơi thường trú" },
  { key: "position", label: "Vị trí công tác" },
  { key: "workplace", label: "Nơi công tác" },
  { key: "candidatePhone", label: "Điện thoại cá nhân" },
  { key: "candidateEmail", label: "Thư điện tử cá nhân" },
  {
    key: "candidateGroup",
    label: "Nhóm đối tượng",
    type: "select",
    options: ["hoi_vien", "can_bo_hoi"],
  },
  { key: "field", label: "Lĩnh vực", type: "select", options: [...FIELDS] },
  { key: "summary", label: "Tóm tắt do đơn vị cung cấp", type: "textarea" },
];

const STATUS: Record<string, { label: string; cls: string }> = {
  moi: { label: "Mới tiếp nhận", cls: "bg-blue-500/15 text-blue-600 dark:text-blue-300" },
  dang_xet: { label: "Đang thẩm định", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  dat: { label: "Đề xuất trao giải", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  khong_dat: { label: "Không đạt", cls: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
};

const AI_STATUS: Record<string, string> = {
  chua: "Chưa xử lý",
  dang_chay: "Đang xử lý",
  xong: "Đã tổng hợp",
  loi: "Lỗi",
};

const fmtDate = (d?: string | null) =>
  d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d.split("-").reverse().join("/") : d || "—";

const CHART_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--muted-foreground))"];

function api(token: string, url: string, init?: RequestInit) {
  return fetch(`${API_BASE}${url}`, {
    ...init,
    headers: { ...(init?.headers || {}), "x-admin-token": token, ...(init?.body ? { "Content-Type": "application/json" } : {}) },
  }).then(async (r) => {
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || "Lỗi máy chủ");
    return r.json();
  });
}

function Login({ onLogin }: { onLogin: (t: string) => void }) {
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const submit = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (!r.ok) throw new Error("Mật khẩu không đúng");
      onLogin((await r.json()).token);
    } catch (e: any) {
      toast({ title: "Không đăng nhập được", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-5">
      <Card className="w-full max-w-sm border-card-border p-8">
        <Logo className="h-10 w-10 text-primary" />
        <h1 className="font-display mt-5 text-xl font-bold tracking-tight">Hệ thống quản trị hồ sơ</h1>
        <p className="mt-1 text-sm text-muted-foreground">Giải thưởng “Thanh niên sống đẹp” 2026</p>
        <div className="mt-6 space-y-2">
          <Label className="text-sm">Mật khẩu quản trị</Label>
          <Input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            data-testid="input-password"
          />
        </div>
        <Button className="mt-5 w-full" onClick={submit} disabled={loading} data-testid="button-login">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Đăng nhập
        </Button>
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value, hint }: { icon: any; label: string; value: string | number; hint?: string }) {
  return (
    <Card className="border-card-border p-5" data-testid={`stat-${label}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="font-display mt-3 text-3xl font-bold">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}

function Row({ k, v }: { k: string; v?: React.ReactNode }) {
  return (
    <div className="border-b border-border py-2.5">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{k}</div>
      <div className="mt-1 whitespace-pre-line text-sm">{v || "—"}</div>
    </div>
  );
}

export default function Admin() {
  const [token, setToken] = useState<string>("");
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("all");
  const [fField, setFField] = useState("all");
  const [openId, setOpenId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState<{ id: number; data: Record<string, string> } | null>(null);
  const [confirmDel, setConfirmDel] = useState<number | null>(null);
  const { toast } = useToast();

  const list = useQuery<any[]>({
    queryKey: ["/api/admin/nominations", token],
    queryFn: () => api(token, "/api/admin/nominations"),
    enabled: !!token,
    refetchInterval: 15000,
  });
  const stats = useQuery<any>({
    queryKey: ["/api/admin/stats", token],
    queryFn: () => api(token, "/api/admin/stats"),
    enabled: !!token,
    refetchInterval: 15000,
  });

  const analyze = useMutation({
    mutationFn: (id: number) => api(token, `/api/admin/nominations/${id}/analyze`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/nominations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Đã cập nhật tổng hợp AI" });
    },
    onError: (e: any) => toast({ title: "Lỗi xử lý AI", description: e.message, variant: "destructive" }),
  });

  const analyzeAll = useMutation({
    mutationFn: () => api(token, "/api/admin/analyze-pending", { method: "POST" }),
    onSuccess: (d: any) => toast({ title: `Đang xử lý ${d.queued} hồ sơ`, description: "Kết quả sẽ tự cập nhật trong bảng." }),
  });

  const driveInfo = useQuery<any>({
    queryKey: ["/api/admin/google/status", token],
    queryFn: () => api(token, "/api/admin/google/status"),
    enabled: !!token,
    refetchInterval: 30000,
  });

  const driveConnect = useMutation({
    mutationFn: () => api(token, "/api/admin/google/auth-url"),
    onSuccess: (d: any) => {
      window.location.href = d.url;
    },
    onError: (e: any) =>
      toast({ title: "Chưa kết nối được", description: e.message, variant: "destructive" }),
  });

  const driveSyncAll = useMutation({
    mutationFn: () => api(token, "/api/admin/drive-sync-all", { method: "POST" }),
    onSuccess: (d: any) =>
      toast({ title: `Đang đồng bộ ${d.queued} hồ sơ lên Drive`, description: "Bảng sẽ tự cập nhật sau vài phút." }),
    onError: (e: any) => toast({ title: "Đồng bộ thất bại", description: e.message, variant: "destructive" }),
  });

  const driveSyncOne = useMutation({
    mutationFn: (id: number) => api(token, `/api/admin/nominations/${id}/drive-sync`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/nominations"] });
      toast({ title: "Đã đồng bộ lên Google Drive" });
    },
    onError: (e: any) => toast({ title: "Đồng bộ thất bại", description: e.message, variant: "destructive" }),
  });

  useEffect(() => {
    const p = new URLSearchParams(window.location.hash.split("?")[1] || "");
    const r = p.get("drive");
    if (!r) return;
    if (r === "ok") toast({ title: "Đã kết nối Google Drive" });
    else if (r === "loi")
      toast({ title: "Kết nối Drive thất bại", description: p.get("msg") || "", variant: "destructive" });
    window.history.replaceState(null, "", window.location.pathname + "#/admin");
  }, []);

  const save = useMutation({
    mutationFn: (v: { id: number; status?: string; reviewerNote?: string }) =>
      api(token, `/api/admin/nominations/${v.id}`, { method: "PATCH", body: JSON.stringify(v) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/nominations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Đã lưu" });
    },
  });

  const dups = useQuery<any[]>({
    queryKey: ["/api/admin/duplicates"],
    queryFn: () => api(token, "/api/admin/duplicates"),
    enabled: !!token,
  });

  const saveEdit = useMutation({
    mutationFn: (v: { id: number; data: Record<string, string> }) =>
      api(token, `/api/admin/nominations/${v.id}`, { method: "PATCH", body: JSON.stringify(v.data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/nominations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/duplicates"] });
      setEditing(null);
      toast({ title: "Đã cập nhật hồ sơ", description: "Thư mục và tệp tổng hợp trên Drive sẽ được cập nhật lại." });
    },
    onError: (e: any) => toast({ title: "Không lưu được", description: e?.message || "", variant: "destructive" }),
  });

  const removeOne = useMutation({
    mutationFn: (id: number) => api(token, `/api/admin/nominations/${id}`, { method: "DELETE" }),
    onSuccess: (d: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/nominations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/duplicates"] });
      setConfirmDel(null);
      setOpenId(null);
      toast({ title: `Đã xóa hồ sơ ${d?.code || ""}`, description: "Thư mục trên Drive đã chuyển vào thùng rác." });
    },
    onError: (e: any) => toast({ title: "Không xóa được", description: e?.message || "", variant: "destructive" }),
  });

  const rows = useMemo(() => {
    const all = list.data || [];
    return all.filter((n) => {
      if (fStatus !== "all" && n.status !== fStatus) return false;
      if (fField !== "all" && n.field !== fField) return false;
      if (q) {
        const s = `${n.code} ${n.fullName} ${n.nominatorName} ${n.workplace}`.toLowerCase();
        if (!s.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [list.data, q, fStatus, fField]);

  const current = (list.data || []).find((n) => n.id === openId);
  const delTarget = (list.data || []).find((n) => n.id === confirmDel);

  if (!token) return <Login onLogin={setToken} />;

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-5">
          <Logo className="h-8 w-8 text-primary" />
          <div className="leading-tight">
            <div className="text-sm font-bold">Quản trị hồ sơ Giải thưởng</div>
            <div className="text-[11px] text-muted-foreground">Thanh niên sống đẹp 2026</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => analyzeAll.mutate()}
              disabled={analyzeAll.isPending}
              data-testid="button-analyze-all"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              AI xử lý hồ sơ mới
            </Button>
            <a href={`${API_BASE}/api/admin/export.csv?token=${token}`} data-testid="link-export">
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Xuất tổng hợp
              </Button>
            </a>
            <Button variant="ghost" size="sm" onClick={() => setToken("")} data-testid="button-logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-5 py-8">
        {/* Thống kê */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {stats.isLoading
            ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28" />)
            : (
              <>
                <Stat icon={Files} label="Tổng hồ sơ" value={stats.data?.total ?? 0} />
                <Stat icon={Building2} label="Đơn vị đề cử" value={stats.data?.units ?? 0} />
                <Stat icon={FileText} label="Tệp đính kèm" value={stats.data?.files ?? 0} />
                <Stat
                  icon={FileCheck2}
                  label="AI đã tổng hợp"
                  value={stats.data?.aiDone ?? 0}
                  hint={`${stats.data?.aiPending ?? 0} hồ sơ chờ xử lý`}
                />
                <Stat icon={AlertTriangle} label="Cảnh báo độ tuổi" value={stats.data?.ageWarnings ?? 0} hint="Cần Hội đồng xem xét" />
              </>
            )}
        </div>

        {/* Kho hồ sơ trên Google Drive */}
        <Card className="border-card-border p-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <HardDrive className="h-5 w-5" />
            </div>
            <div className="min-w-[220px] flex-1">
              <div className="text-sm font-semibold">Kho hồ sơ trên Google Drive</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {driveInfo.data?.connected
                  ? `Mỗi hồ sơ lưu thành một thư mục riêng trong “${driveInfo.data?.rootName}” · tài khoản ${driveInfo.data?.email || "đã kết nối"}`
                  : driveInfo.data?.configured
                    ? "Chưa kết nối. Cấp quyền một lần để hệ thống tự tạo thư mục cho từng hồ sơ."
                    : "Chưa cấu hình OAuth trên máy chủ."}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {driveInfo.data?.rootFolderUrl && (
                <a href={driveInfo.data.rootFolderUrl} target="_blank" rel="noreferrer" data-testid="link-drive-root">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Mở thư mục
                  </Button>
                </a>
              )}
              {driveInfo.data?.connected ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => driveSyncAll.mutate()}
                  disabled={driveSyncAll.isPending}
                  data-testid="button-drive-sync-all"
                >
                  <FolderSync className="mr-2 h-4 w-4" />
                  Đồng bộ hồ sơ còn thiếu
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => driveConnect.mutate()}
                  disabled={driveConnect.isPending || !driveInfo.data?.configured}
                  data-testid="button-drive-connect"
                >
                  <HardDrive className="mr-2 h-4 w-4" />
                  Kết nối Google Drive
                </Button>
              )}
            </div>
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card className="border-card-border p-5">
            <h2 className="text-sm font-semibold">Hồ sơ theo lĩnh vực</h2>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(stats.data?.byField || []).map((d: any) => ({ ...d, name: d.name.split(",")[0].slice(0, 26) }))} margin={{ left: -20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" interval={0} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Hồ sơ" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="border-card-border p-5">
            <h2 className="text-sm font-semibold">Trạng thái thẩm định</h2>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={(stats.data?.byStatus || []).map((d: any) => ({ ...d, name: STATUS[d.name]?.label || d.name }))}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {(stats.data?.byStatus || []).map((_: any, i: number) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Cảnh báo hồ sơ nghi trùng */}
        {!!dups.data?.length && (
          <Card className="border-amber-500/40 p-5">
            <div className="flex items-center gap-2">
              <Copy className="h-5 w-5 text-amber-600" />
              <div className="text-sm font-semibold">Hồ sơ nghi trùng cần rà soát ({dups.data.length} nhóm)</div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Hệ thống đã chặn tự động khi đơn vị nộp trùng. Những nhóm dưới đây vẫn còn trùng do được xác nhận gửi
              tiếp hoặc nhập từ trước.
            </p>
            <div className="mt-4 space-y-3">
              {dups.data.map((g: any) => (
                <div key={g.key} className="rounded-md border border-border bg-secondary/30 p-3">
                  <div className="text-xs font-medium text-muted-foreground">{g.reason}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {g.items.map((it: any) => (
                      <Button
                        key={it.id}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setOpenId(it.id);
                          setNote("");
                        }}
                        data-testid={`button-dup-${it.id}`}
                      >
                        <span className="font-mono text-[11px]">{it.code}</span>
                        <span className="ml-2">{it.fullName}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{it.nominatorName}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Bảng tổng hợp */}
        <Card className="border-card-border">
          <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm theo tên, mã hồ sơ, đơn vị…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Select value={fStatus} onValueChange={setFStatus}>
              <SelectTrigger className="w-48" data-testid="select-filter-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                {Object.entries(STATUS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={fField} onValueChange={setFField}>
              <SelectTrigger className="w-56" data-testid="select-filter-field">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả lĩnh vực</SelectItem>
                {FIELDS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.slice(0, 40)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={() => list.refetch()} data-testid="button-refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table className="min-w-[1180px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Mã hồ sơ</TableHead>
                  <TableHead className="min-w-[180px]">Đơn vị đề cử</TableHead>
                  <TableHead className="min-w-[150px]">Họ và tên</TableHead>
                  <TableHead className="w-28 whitespace-nowrap">Ngày sinh</TableHead>
                  <TableHead className="w-16">Tuổi</TableHead>
                  <TableHead className="min-w-[220px]">Vị trí / Nơi công tác</TableHead>
                  <TableHead className="min-w-[300px]">Tóm tắt thành tích nổi bật (AI)</TableHead>
                  <TableHead className="w-32">AI</TableHead>
                  <TableHead className="w-40">Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.isLoading && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                      Đang tải dữ liệu…
                    </TableCell>
                  </TableRow>
                )}
                {!list.isLoading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-14 text-center text-sm text-muted-foreground">
                      Chưa có hồ sơ nào phù hợp bộ lọc.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((n) => {
                  const ai = n.aiResult || {};
                  const badAge =
                    n.age == null || (n.candidateGroup === "can_bo_hoi" ? n.age < 23 || n.age > 40 : n.age < 16 || n.age > 30);
                  return (
                    <TableRow
                      key={n.id}
                      className="cursor-pointer"
                      onClick={() => {
                        setOpenId(n.id);
                        setNote(n.reviewerNote || "");
                      }}
                      data-testid={`row-nomination-${n.id}`}
                    >
                      <TableCell className="font-mono text-xs">{n.code}</TableCell>
                      <TableCell className="min-w-[180px] text-sm">{n.nominatorName}</TableCell>
                      <TableCell className="min-w-[150px] text-sm font-medium">{ai.hoTen || n.fullName}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{fmtDate(n.dob)}</TableCell>
                      <TableCell>
                        <span className={`text-sm font-medium ${badAge ? "text-destructive" : ""}`}>{n.age ?? "—"}</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {ai.viTriNoiCongTac || [n.position, n.workplace].filter(Boolean).join(" - ") || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <span className="line-clamp-3">{ai.tomTatThanhTich || n.summary || "Chưa có tổng hợp"}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={n.aiStatus === "xong" ? "secondary" : "outline"} className="text-[11px]">
                          {n.aiStatus === "dang_chay" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                          {AI_STATUS[n.aiStatus]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS[n.status]?.cls}`}>
                          {STATUS[n.status]?.label}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>

      {/* Chi tiết hồ sơ */}
      <Dialog open={!!current} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          {current && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg">
                  {current.fullName} · <span className="font-mono text-sm text-muted-foreground">{current.code}</span>
                </DialogTitle>
              </DialogHeader>

              <div className="flex flex-wrap items-center gap-3">
                <Select value={current.status} onValueChange={(v) => save.mutate({ id: current.id, status: v })}>
                  <SelectTrigger className="w-52" data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => analyze.mutate(current.id)}
                  disabled={analyze.isPending}
                  data-testid="button-analyze"
                >
                  {analyze.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Chạy lại OCR & tổng hợp AI
                </Button>
                {current.driveFolderUrl ? (
                  <a href={current.driveFolderUrl} target="_blank" rel="noreferrer" data-testid="link-drive-folder">
                    <Button variant="outline" size="sm">
                      <HardDrive className="mr-2 h-4 w-4" />
                      Mở thư mục Drive
                    </Button>
                  </a>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => driveSyncOne.mutate(current.id)}
                    disabled={driveSyncOne.isPending || !driveInfo.data?.connected}
                    data-testid="button-drive-sync-one"
                  >
                    {driveSyncOne.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FolderSync className="mr-2 h-4 w-4" />
                    )}
                    Đưa hồ sơ lên Drive
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const d: Record<string, string> = {};
                    for (const f of EDIT_FIELDS) d[f.key] = String((current as any)[f.key] ?? "");
                    setEditing({ id: current.id, data: d });
                  }}
                  data-testid="button-edit"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Sửa thông tin
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirmDel(current.id)}
                  data-testid="button-delete"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Xóa hồ sơ
                </Button>
              </div>

              <Tabs defaultValue="ai" className="mt-2">
                <TabsList>
                  <TabsTrigger value="ai" data-testid="tab-ai">Tổng hợp AI</TabsTrigger>
                  <TabsTrigger value="khaibao" data-testid="tab-declared">Thông tin khai báo</TabsTrigger>
                  <TabsTrigger value="files" data-testid="tab-files">
                    Tệp đính kèm ({current.files.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="ai" className="mt-4">
                  {current.aiStatus !== "xong" || !current.aiResult ? (
                    <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                      {current.aiStatus === "dang_chay"
                        ? "AI đang đọc và tổng hợp hồ sơ…"
                        : current.aiStatus === "loi"
                          ? `Xử lý lỗi: ${current.aiResult?.error || "không xác định"}`
                          : "Chưa có kết quả tổng hợp. Bấm “Chạy lại OCR & tổng hợp AI”."}
                    </div>
                  ) : (
                    <div className="grid gap-x-8 md:grid-cols-2">
                      <div>
                        <Row k="Đơn vị đề cử" v={current.aiResult.donViDeCu} />
                        <Row k="Họ và tên" v={current.aiResult.hoTen} />
                        <Row k="Ngày tháng năm sinh" v={`${fmtDate(current.aiResult.ngaySinh)} · Tuổi đến 31/12/2026: ${current.age ?? "—"}`} />
                        <Row k="Vị trí / Nơi công tác" v={current.aiResult.viTriNoiCongTac} />
                        <Row k="Khen thưởng" v={current.aiResult.khenThuong} />
                      </div>
                      <div>
                        <Row k="Tóm tắt thành tích nổi bật" v={current.aiResult.tomTatThanhTich} />
                        <Row k="Nhận xét, đánh giá" v={current.aiResult.nhanXetDanhGia} />
                        <div className="flex flex-wrap gap-2 py-3">
                          <Badge variant={current.aiResult.tuoiHopLe ? "secondary" : "destructive"}>
                            {current.aiResult.tuoiHopLe ? "Độ tuổi hợp lệ" : "Độ tuổi cần xem xét"}
                          </Badge>
                          <Badge variant={current.aiResult.duDieuKienThanhTich ? "secondary" : "destructive"}>
                            {current.aiResult.duDieuKienThanhTich ? "Đủ điều kiện thành tích" : "Thành tích cần bổ sung"}
                          </Badge>
                          <Badge variant="outline">Độ tin cậy: {current.aiResult.doTinCay || "—"}</Badge>
                        </div>
                        {(current.aiResult.hoSoThieu || []).length > 0 && (
                          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
                            <strong>Hồ sơ còn thiếu:</strong>
                            <ul className="mt-1 list-inside list-disc">
                              {current.aiResult.hoSoThieu.map((x: string) => (
                                <li key={x}>{x}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="mt-5 space-y-2">
                    <Label className="text-sm">Nhận xét của chuyên viên thẩm định</Label>
                    <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} data-testid="input-note" />
                    <Button size="sm" onClick={() => save.mutate({ id: current.id, reviewerNote: note })} data-testid="button-save-note">
                      Lưu nhận xét
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="khaibao" className="mt-4 grid gap-x-8 md:grid-cols-2">
                  <div>
                    <Row k="Đơn vị đề cử" v={`${current.nominatorName} (${current.nominatorType})`} />
                    <Row k="Người liên hệ" v={`${current.contactName} · ${current.contactPhone} · ${current.contactEmail}`} />
                    <Row k="Giới tính / Dân tộc / Tôn giáo" v={[current.gender, current.ethnicity, current.religion].filter(Boolean).join(" · ")} />
                    <Row k="Nơi thường trú" v={current.residence} />
                  </div>
                  <div>
                    <Row k="Nơi công tác" v={[current.position, current.workplace].filter(Boolean).join(" - ")} />
                    <Row k="Nhóm đối tượng" v={current.candidateGroup === "can_bo_hoi" ? "Cán bộ Hội LHTN Việt Nam" : "Hội viên, thanh niên"} />
                    <Row k="Lĩnh vực" v={current.field} />
                    <Row k="Tóm tắt do đơn vị cung cấp" v={current.summary} />
                    <Row k="Thời điểm nộp" v={new Date(current.createdAt).toLocaleString("vi-VN")} />
                  </div>
                </TabsContent>

                <TabsContent value="files" className="mt-4 space-y-2">
                  {current.files.map((f: any) => {
                    const isImg = /\.(jpe?g|png|webp|gif)$/i.test(f.name);
                    const url = `${API_BASE}/api/files/${f.id}?token=${token}`;
                    return (
                      <a
                        key={f.id}
                        href={`${url}&download=1`}
                        className="flex items-center gap-4 rounded-md border border-card-border p-3 hover:bg-accent"
                        data-testid={`link-file-${f.id}`}
                      >
                        {isImg ? (
                          <img src={url} alt="" className="h-12 w-12 rounded object-cover" />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded bg-secondary">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{f.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {f.slot} · {(f.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                        </div>
                        <Download className="h-4 w-4 text-muted-foreground" />
                      </a>
                    );
                  })}
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Sửa thông tin hồ sơ */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sửa thông tin hồ sơ</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Dùng khi đơn vị khai báo sai hoặc cần chuẩn hóa dữ liệu. Tệp đính kèm giữ nguyên; tệp tổng hợp trên Google
            Drive sẽ được ghi đè theo thông tin mới.
          </p>
          {editing && (
            <div className="grid gap-4 md:grid-cols-2">
              {EDIT_FIELDS.map((f) => (
                <div key={f.key} className={`space-y-2 ${f.type === "textarea" ? "md:col-span-2" : ""}`}>
                  <Label className="text-sm">{f.label}</Label>
                  {f.type === "textarea" ? (
                    <Textarea
                      rows={4}
                      value={editing.data[f.key] || ""}
                      onChange={(e) => setEditing({ ...editing, data: { ...editing.data, [f.key]: e.target.value } })}
                      data-testid={`input-edit-${f.key}`}
                    />
                  ) : f.type === "select" ? (
                    <Select
                      value={editing.data[f.key] || ""}
                      onValueChange={(v) => setEditing({ ...editing, data: { ...editing.data, [f.key]: v } })}
                    >
                      <SelectTrigger data-testid={`select-edit-${f.key}`}>
                        <SelectValue placeholder="Chọn" />
                      </SelectTrigger>
                      <SelectContent>
                        {(f.options || []).map((o) => (
                          <SelectItem key={o} value={o}>
                            {o === "hoi_vien" ? "Hội viên, thanh niên" : o === "can_bo_hoi" ? "Cán bộ Hội" : o}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={f.type === "date" ? "date" : "text"}
                      value={editing.data[f.key] || ""}
                      onChange={(e) => setEditing({ ...editing, data: { ...editing.data, [f.key]: e.target.value } })}
                      data-testid={`input-edit-${f.key}`}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(null)} data-testid="button-edit-cancel">
              Hủy
            </Button>
            <Button
              onClick={() => editing && saveEdit.mutate(editing)}
              disabled={saveEdit.isPending}
              data-testid="button-edit-save"
            >
              {saveEdit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu thay đổi
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Xác nhận xóa */}
      <Dialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Xác nhận xóa hồ sơ
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-relaxed">
            Hồ sơ <span className="font-semibold">{delTarget?.code}</span> của{" "}
            <span className="font-semibold">{delTarget?.fullName}</span> sẽ bị xóa khỏi cơ sở dữ liệu, toàn bộ tệp
            đính kèm trên máy chủ bị xóa vĩnh viễn và thư mục tương ứng trên Google Drive được chuyển vào thùng rác.
            Thao tác này không thể hoàn tác từ hệ thống.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDel(null)} data-testid="button-delete-cancel">
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmDel && removeOne.mutate(confirmDel)}
              disabled={removeOne.isPending}
              data-testid="button-delete-confirm"
            >
              {removeOne.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xóa hồ sơ
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
