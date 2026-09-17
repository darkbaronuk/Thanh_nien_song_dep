import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "node:http";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { storage } from "./storage";
import { analyzeNomination, UPLOAD_DIR } from "./ai";
import { FILE_SLOTS, type StoredFile } from "@shared/schema";
import * as drive from "./drive";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "TNSD2026";
const tokens = new Set<string>();

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_r, _f, cb) => cb(null, UPLOAD_DIR),
    filename: (_r, file, cb) =>
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 25 * 1024 * 1024, files: 40 },
});

function fixName(name: string) {
  // multer nhận filename dạng latin1, chuyển lại UTF-8 cho tên tiếng Việt
  try {
    return Buffer.from(name, "latin1").toString("utf8");
  } catch {
    return name;
  }
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = (req.headers["x-admin-token"] as string) || (req.query.token as string) || "";
  if (!tokens.has(token)) return res.status(401).json({ message: "Chưa đăng nhập" });
  next();
}

/** Chuẩn hóa chuỗi để so khớp: bỏ dấu, bỏ khoảng trắng thừa, chuyển chữ thường. */
function norm(s: string) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "D")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normPhone(s: string) {
  const d = String(s || "").replace(/\D/g, "");
  return d.length >= 9 ? d.replace(/^84/, "0").slice(-9) : "";
}

type DupHit = { id: number; code: string; createdAt: string; fullName: string; nominatorName: string; reason: string };

/** Tìm hồ sơ có khả năng trùng với dữ liệu đang nộp. */
function findDuplicates(data: {
  fullName: string;
  dob: string;
  candidatePhone?: string;
  candidateEmail?: string;
  excludeId?: number;
}): DupHit[] {
  const name = norm(data.fullName);
  const phone = normPhone(data.candidatePhone || "");
  const email = norm(data.candidateEmail || "");
  const hits: DupHit[] = [];
  for (const n of storage.list()) {
    if (data.excludeId && n.id === data.excludeId) continue;
    let reason = "";
    if (name && norm(n.fullName) === name && n.dob === data.dob) reason = "trùng họ tên và ngày sinh";
    else if (phone && normPhone(n.candidatePhone) === phone) reason = "trùng số điện thoại cá nhân";
    else if (email && norm(n.candidateEmail) === email) reason = "trùng thư điện tử cá nhân";
    else if (name && norm(n.fullName) === name) reason = "trùng họ tên";
    if (reason)
      hits.push({
        id: n.id,
        code: n.code,
        createdAt: n.createdAt,
        fullName: n.fullName,
        nominatorName: n.nominatorName,
        reason,
      });
  }
  return hits;
}

/** Xóa tệp đính kèm trên đĩa của một hồ sơ. */
function removeLocalFiles(filesJson: string) {
  let list: StoredFile[] = [];
  try {
    list = JSON.parse(filesJson || "[]");
  } catch {
    list = [];
  }
  for (const f of list) {
    try {
      fs.unlinkSync(path.join(UPLOAD_DIR, path.basename(f.id)));
    } catch {
      // tệp không còn tồn tại
    }
  }
}

function ageAt(dob: string) {
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const ref = new Date("2026-12-31");
  let a = ref.getFullYear() - d.getFullYear();
  const m = ref.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < d.getDate())) a--;
  return a;
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // ---------- Nộp hồ sơ (công khai) ----------
  app.post(
    "/api/nominations",
    upload.fields(FILE_SLOTS.map((s) => ({ name: s.key, maxCount: s.max }))),
    async (req: Request, res: Response) => {
      try {
        const b = req.body as Record<string, string>;
        const required = ["nominatorType", "nominatorName", "contactName", "contactPhone", "contactEmail", "fullName", "dob", "candidateGroup", "field"];
        for (const k of required) {
          if (!b[k] || !String(b[k]).trim()) return res.status(400).json({ message: `Thiếu trường bắt buộc: ${k}` });
        }

        const grouped = (req.files || {}) as Record<string, Express.Multer.File[]>;

        // Chống nộp trùng: chặn lại nếu trùng họ tên, ngày sinh hoặc liên hệ cá nhân
        if (String(b.confirmDuplicate || "") !== "1") {
          const dups = findDuplicates({
            fullName: b.fullName,
            dob: b.dob,
            candidatePhone: b.candidatePhone,
            candidateEmail: b.candidateEmail,
          });
          if (dups.length) {
            for (const list of Object.values(grouped)) {
              for (const f of list) {
                try {
                  fs.unlinkSync(f.path);
                } catch {
                  // bỏ qua
                }
              }
            }
            const d = dups[0];
            return res.status(409).json({
              message: `Hệ thống phát hiện hồ sơ đã có (${d.reason}): mã ${d.code}, ${d.fullName}, do ${d.nominatorName} gửi ngày ${d.createdAt.slice(0, 10)}.`,
              duplicate: dups.slice(0, 5),
            });
          }
        }

        const files: StoredFile[] = [];
        for (const slot of FILE_SLOTS) {
          const list = grouped[slot.key] || [];
          if (slot.required && list.length === 0)
            return res.status(400).json({ message: `Thiếu thành phần hồ sơ: ${slot.label}` });
          if ("min" in slot && slot.min && list.length < slot.min)
            return res.status(400).json({ message: `${slot.label}: cần tối thiểu ${slot.min} tệp` });
          for (const f of list) {
            files.push({ id: f.filename, slot: slot.key, name: fixName(f.originalname), mime: f.mimetype, size: f.size });
          }
        }

        const created = storage.create({
          code: `TNSD26-${String(Date.now()).slice(-6)}`,
          createdAt: new Date().toISOString(),
          nominatorType: b.nominatorType,
          nominatorName: b.nominatorName,
          contactName: b.contactName,
          contactPhone: b.contactPhone,
          contactEmail: b.contactEmail,
          fullName: b.fullName,
          dob: b.dob,
          gender: b.gender || "",
          ethnicity: b.ethnicity || "",
          religion: b.religion || "",
          residence: b.residence || "",
          workplace: b.workplace || "",
          position: b.position || "",
          candidatePhone: b.candidatePhone || "",
          candidateEmail: b.candidateEmail || "",
          candidateGroup: b.candidateGroup,
          field: b.field,
          summary: b.summary || "",
          files: JSON.stringify(files),
        });

        res.json({ code: created.code, id: created.id });

        // Chạy AI nền ngay sau khi nhận hồ sơ
        runAnalyze(created.id).catch(() => {});
      } catch (e: any) {
        console.error(e);
        res.status(500).json({ message: e?.message || "Lỗi máy chủ" });
      }
    },
  );

  app.get("/api/nominations/count", (_req, res) => {
    const all = storage.list();
    res.json({
      total: all.length,
      units: new Set(all.map((n) => n.nominatorName.trim().toLowerCase())).size,
    });
  });

  // ---------- Đăng nhập quản trị ----------
  app.post("/api/admin/login", (req, res) => {
    if (req.body?.password !== ADMIN_PASSWORD) return res.status(401).json({ message: "Mật khẩu không đúng" });
    const t = crypto.randomBytes(24).toString("hex");
    tokens.add(t);
    res.json({ token: t });
  });

  // ---------- Quản trị ----------
  app.get("/api/admin/nominations", requireAdmin, (_req, res) => {
    res.json(
      storage.list().map((n) => ({
        ...n,
        files: JSON.parse(n.files || "[]"),
        aiResult: n.aiResult ? JSON.parse(n.aiResult) : null,
        age: ageAt(n.dob),
      })),
    );
  });

  app.get("/api/admin/stats", requireAdmin, (_req, res) => {
    const all = storage.list();
    const by = (fn: (n: any) => string) =>
      Object.entries(
        all.reduce<Record<string, number>>((acc, n) => {
          const k = fn(n) || "Khác";
          acc[k] = (acc[k] || 0) + 1;
          return acc;
        }, {}),
      ).map(([name, value]) => ({ name, value }));

    const days: Record<string, number> = {};
    for (const n of all) {
      const d = n.createdAt.slice(0, 10);
      days[d] = (days[d] || 0) + 1;
    }

    res.json({
      total: all.length,
      byStatus: by((n) => n.status),
      byField: by((n) => n.field),
      byNominatorType: by((n) => n.nominatorType),
      byGroup: by((n) => (n.candidateGroup === "can_bo_hoi" ? "Cán bộ Hội" : "Hội viên, thanh niên")),
      byDay: Object.entries(days)
        .sort()
        .map(([name, value]) => ({ name, value })),
      units: new Set(all.map((n) => n.nominatorName.trim().toLowerCase())).size,
      aiDone: all.filter((n) => n.aiStatus === "xong").length,
      aiPending: all.filter((n) => n.aiStatus !== "xong").length,
      files: all.reduce((s, n) => s + JSON.parse(n.files || "[]").length, 0),
      ageWarnings: all.filter((n) => {
        const a = ageAt(n.dob);
        if (a == null) return true;
        return n.candidateGroup === "can_bo_hoi" ? a < 23 || a > 40 : a < 16 || a > 30;
      }).length,
    });
  });

  // Các trường quản trị được phép chỉnh sửa
  const EDITABLE = [
    "nominatorType",
    "nominatorName",
    "contactName",
    "contactPhone",
    "contactEmail",
    "fullName",
    "dob",
    "gender",
    "ethnicity",
    "religion",
    "residence",
    "workplace",
    "position",
    "candidatePhone",
    "candidateEmail",
    "candidateGroup",
    "field",
    "summary",
  ] as const;

  app.patch("/api/admin/nominations/:id", requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const before = storage.get(id);
    if (!before) return res.status(404).json({ message: "Không tìm thấy hồ sơ" });

    const patch: any = {};
    if (typeof req.body.status === "string") patch.status = req.body.status;
    if (typeof req.body.reviewerNote === "string") patch.reviewerNote = req.body.reviewerNote;
    if (req.body.aiResult) patch.aiResult = JSON.stringify(req.body.aiResult);
    for (const k of EDITABLE) {
      if (typeof req.body[k] === "string") patch[k] = String(req.body[k]).trim();
    }
    for (const k of ["fullName", "dob", "nominatorName", "candidateGroup", "field"]) {
      if (k in patch && !patch[k]) return res.status(400).json({ message: `Trường bắt buộc không được để trống` });
    }

    const n = storage.update(id, patch);
    if (!n) return res.status(404).json({ message: "Không tìm thấy hồ sơ" });
    res.json({ ok: true });

    // Cập nhật lại thư mục và tệp tổng hợp trên Drive khi thông tin thay đổi
    const touched = Object.keys(patch).some((k) => k !== "status" && k !== "reviewerNote");
    if (touched && (before as any).driveFolderId) {
      (async () => {
        try {
          if (patch.fullName || patch.nominatorName) await drive.renameNominationFolder(id);
          await drive.syncNominationSafe(id);
        } catch (e: any) {
          console.error("Cập nhật Drive sau khi sửa", id, e?.message);
        }
      })();
    }
  });

  app.delete("/api/admin/nominations/:id", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const n = storage.get(id);
    if (!n) return res.status(404).json({ message: "Không tìm thấy hồ sơ" });
    await drive.trashNominationFolder(id);
    removeLocalFiles(n.files);
    storage.remove(id);
    res.json({ ok: true, code: n.code });
  });

  // Danh sách nhóm hồ sơ nghi trùng, phục vụ rà soát
  app.get("/api/admin/duplicates", requireAdmin, (_req, res) => {
    const all = storage.list();
    const groups: Record<string, { key: string; reason: string; items: any[] }> = {};
    const add = (key: string, reason: string, n: any) => {
      groups[key] = groups[key] || { key, reason, items: [] };
      if (!groups[key].items.some((x) => x.id === n.id))
        groups[key].items.push({
          id: n.id,
          code: n.code,
          fullName: n.fullName,
          dob: n.dob,
          nominatorName: n.nominatorName,
          createdAt: n.createdAt,
          status: n.status,
        });
    };
    for (const n of all) {
      const nameKey = norm(n.fullName);
      if (nameKey) add(`ten:${nameKey}|${n.dob}`, "Cùng họ tên và ngày sinh", n);
      const p = normPhone(n.candidatePhone);
      if (p) add(`sdt:${p}`, "Cùng số điện thoại cá nhân", n);
      const e = norm(n.candidateEmail);
      if (e) add(`email:${e}`, "Cùng thư điện tử cá nhân", n);
    }
    res.json(Object.values(groups).filter((g) => g.items.length > 1));
  });

  async function runAnalyze(id: number) {
    const n = storage.get(id);
    if (!n) return;
    storage.update(id, { aiStatus: "dang_chay" });
    try {
      const result = await analyzeNomination(n);
      storage.update(id, { aiStatus: "xong", aiResult: JSON.stringify(result) });
    } catch (e: any) {
      console.error("AI error", id, e?.message);
      storage.update(id, { aiStatus: "loi", aiResult: JSON.stringify({ error: e?.message || "Lỗi AI" }) });
    }
    // Sau khi có kết quả AI thì đồng bộ hồ sơ lên Google Drive
    await drive.syncNominationSafe(id);
  }

  // ---------- Google Drive ----------
  app.get("/api/admin/google/status", requireAdmin, (_req, res) => {
    res.json(drive.driveStatus());
  });

  app.get("/api/admin/google/auth-url", requireAdmin, (_req, res) => {
    try {
      res.json({ url: drive.buildAuthUrl() });
    } catch (e: any) {
      res.status(400).json({ message: e?.message || "Chưa cấu hình OAuth" });
    }
  });

  app.get("/api/admin/google/callback", async (req, res) => {
    const code = String(req.query.code || "");
    const state = String(req.query.state || "");
    const site = process.env.SITE_URL || "https://thanhniensongdep.vn";
    if (!code) return res.redirect(`${site}/#/admin?drive=huy`);
    try {
      await drive.handleCallback(code, state);
      res.redirect(`${site}/#/admin?drive=ok`);
    } catch (e: any) {
      console.error("Drive OAuth", e?.message);
      res.redirect(`${site}/#/admin?drive=loi&msg=${encodeURIComponent(e?.message || "")}`);
    }
  });

  app.post("/api/admin/google/disconnect", requireAdmin, (_req, res) => {
    drive.disconnect();
    res.json(drive.driveStatus());
  });

  app.post("/api/admin/nominations/:id/drive-sync", requireAdmin, async (req, res) => {
    try {
      const r = await drive.syncNomination(Number(req.params.id));
      res.json(r);
    } catch (e: any) {
      res.status(400).json({ message: e?.message || "Đồng bộ thất bại" });
    }
  });

  app.post("/api/admin/drive-sync-all", requireAdmin, async (_req, res) => {
    const pending = storage.list().filter((n: any) => n.driveStatus !== "xong");
    res.json({ queued: pending.length });
    for (const n of pending) await drive.syncNominationSafe(n.id);
  });

  app.post("/api/admin/nominations/:id/analyze", requireAdmin, async (req, res) => {
    await runAnalyze(Number(req.params.id));
    const n = storage.get(Number(req.params.id));
    res.json({ aiStatus: n?.aiStatus, aiResult: n?.aiResult ? JSON.parse(n.aiResult) : null });
  });

  app.post("/api/admin/analyze-pending", requireAdmin, async (_req, res) => {
    const pending = storage.list().filter((n) => n.aiStatus !== "xong" && n.aiStatus !== "dang_chay");
    res.json({ queued: pending.length });
    for (const n of pending) await runAnalyze(n.id);
  });

  // ---------- Tệp đính kèm ----------
  app.get("/api/files/:id", requireAdmin, (req, res) => {
    const fileId = String(req.params.id);
    const p = path.join(UPLOAD_DIR, path.basename(fileId));
    if (!fs.existsSync(p)) return res.status(404).json({ message: "Không tìm thấy tệp" });
    const all = storage.list();
    let name: string = fileId;
    for (const n of all) {
      const f = (JSON.parse(n.files || "[]") as StoredFile[]).find((x) => x.id === fileId);
      if (f) name = f.name;
    }
    if (req.query.download === "1") res.download(p, name);
    else res.sendFile(p);
  });

  // ---------- Xuất dữ liệu tổng hợp ----------
  app.get("/api/admin/export.csv", requireAdmin, (_req, res) => {
    const rows = storage.list().map((n) => {
      const ai = n.aiResult ? JSON.parse(n.aiResult) : {};
      return [
        n.code,
        n.nominatorName,
        n.nominatorType,
        ai.hoTen || n.fullName,
        ai.ngaySinh || n.dob,
        String(ageAt(n.dob) ?? ""),
        ai.viTriNoiCongTac || `${n.position} - ${n.workplace}`,
        n.field,
        ai.tomTatThanhTich || n.summary,
        ai.khenThuong || "",
        ai.nhanXetDanhGia || "",
        n.status,
        (n as any).driveFolderUrl || "",
      ];
    });
    const header = [
      "Mã hồ sơ",
      "Đơn vị đề cử",
      "Loại đơn vị",
      "Họ và tên",
      "Ngày sinh",
      "Tuổi (31/12/2026)",
      "Vị trí / Nơi công tác",
      "Lĩnh vực",
      "Tóm tắt thành tích nổi bật",
      "Khen thưởng",
      "Nhận xét đánh giá",
      "Trạng thái",
      "Thư mục Google Drive",
    ];
    const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = "\uFEFF" + [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="tong-hop-ho-so-tnsd-2026.csv"');
    res.send(csv);
  });

  return httpServer;
}
