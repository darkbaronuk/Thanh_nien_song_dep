/**
 * Đồng bộ hồ sơ lên Google Drive của Ban Tổ chức.
 * Mỗi hồ sơ được lưu thành một thư mục riêng trong thư mục mẹ chung.
 * Dùng OAuth phạm vi drive.file: chỉ đọc/ghi được tệp do chính ứng dụng tạo ra.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { Nomination, StoredFile, AiResult } from "@shared/schema";
import { FILE_SLOTS } from "@shared/schema";
import { storage } from "./storage";
import { UPLOAD_DIR } from "./ai";

const DATA_DIR = process.env.DATA_DIR || process.cwd();
const TOKEN_FILE = path.join(DATA_DIR, "google-token.json");

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET || "";
const REDIRECT_URI =
  process.env.GOOGLE_OAUTH_REDIRECT || "https://api.thanhniensongdep.vn/api/admin/google/callback";
const ROOT_NAME = process.env.DRIVE_ROOT_NAME || "Giải thưởng Thanh niên sống đẹp 2026";
const SHARE_EMAILS = (process.env.DRIVE_SHARE_EMAILS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const SCOPE = "https://www.googleapis.com/auth/drive.file";

type TokenStore = {
  refreshToken: string;
  email: string;
  rootFolderId?: string;
  sharedWith?: string[];
  connectedAt: string;
};

let cachedAccess: { token: string; exp: number } | null = null;

function readToken(): TokenStore | null {
  try {
    return JSON.parse(fs.readFileSync(TOKEN_FILE, "utf8")) as TokenStore;
  } catch {
    return null;
  }
}

function writeToken(t: TokenStore) {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(t, null, 2), { mode: 0o600 });
  cachedAccess = null;
}

export function isConfigured() {
  return Boolean(CLIENT_ID && CLIENT_SECRET);
}

export function driveStatus() {
  const t = readToken();
  return {
    configured: isConfigured(),
    connected: Boolean(t?.refreshToken),
    email: t?.email || "",
    rootFolderId: t?.rootFolderId || "",
    rootFolderUrl: t?.rootFolderId ? `https://drive.google.com/drive/folders/${t.rootFolderId}` : "",
    rootName: ROOT_NAME,
    shareEmails: SHARE_EMAILS,
    redirectUri: REDIRECT_URI,
  };
}

/* ---------------- OAuth ---------------- */

const states = new Map<string, number>();

export function buildAuthUrl() {
  if (!isConfigured()) throw new Error("Chưa cấu hình GOOGLE_OAUTH_CLIENT_ID / SECRET");
  const state = crypto.randomBytes(16).toString("hex");
  states.set(state, Date.now() + 10 * 60 * 1000);
  const p = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`;
}

function checkState(state: string) {
  const exp = states.get(state);
  states.delete(state);
  return Boolean(exp && exp > Date.now());
}

export async function handleCallback(code: string, state: string) {
  if (!checkState(state)) throw new Error("Phiên cấp quyền không hợp lệ hoặc đã hết hạn");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  const data: any = await res.json();
  if (!res.ok || !data.refresh_token)
    throw new Error(data.error_description || data.error || "Không lấy được refresh token");

  cachedAccess = { token: data.access_token, exp: Date.now() + (data.expires_in - 60) * 1000 };
  let email = "";
  try {
    const me: any = await api("/about?fields=user");
    email = me?.user?.emailAddress || "";
  } catch {
    /* bỏ qua */
  }
  const prev = readToken();
  writeToken({
    refreshToken: data.refresh_token,
    email,
    rootFolderId: prev?.rootFolderId,
    sharedWith: prev?.sharedWith || [],
    connectedAt: new Date().toISOString(),
  });
  cachedAccess = { token: data.access_token, exp: Date.now() + (data.expires_in - 60) * 1000 };
  await ensureRootFolder();
  return driveStatus();
}

export function disconnect() {
  try {
    fs.unlinkSync(TOKEN_FILE);
  } catch {
    /* bỏ qua */
  }
  cachedAccess = null;
}

async function accessToken(): Promise<string> {
  if (cachedAccess && cachedAccess.exp > Date.now()) return cachedAccess.token;
  const t = readToken();
  if (!t?.refreshToken) throw new Error("Chưa kết nối Google Drive");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: t.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data: any = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || "Làm mới token thất bại");
  cachedAccess = { token: data.access_token, exp: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedAccess.token;
}

/* ---------------- Drive API ---------------- */

async function api(pathname: string, init: RequestInit = {}): Promise<any> {
  const token = await accessToken();
  const res = await fetch(`https://www.googleapis.com/drive/v3${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data?.error?.message || `Drive lỗi ${res.status}`);
  return data;
}

async function createFolder(name: string, parentId?: string): Promise<string> {
  const data = await api("/files?fields=id", {
    method: "POST",
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      ...(parentId ? { parents: [parentId] } : {}),
    }),
  });
  return data.id as string;
}

async function uploadFile(opts: {
  name: string;
  mime: string;
  parentId: string;
  body: Buffer;
}): Promise<{ id: string; webViewLink: string }> {
  const token = await accessToken();
  const boundary = `tnsd${crypto.randomBytes(12).toString("hex")}`;
  const meta = JSON.stringify({ name: opts.name, parents: [opts.parentId] });
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: ${opts.mime || "application/octet-stream"}\r\n\r\n`),
    opts.body,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );
  const data: any = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Tải tệp lên Drive lỗi ${res.status}`);
  return data;
}

async function shareFolder(folderId: string, emails: string[]) {
  const t = readToken();
  const done = new Set(t?.sharedWith || []);
  for (const email of emails) {
    if (done.has(email)) continue;
    try {
      await api(`/files/${folderId}/permissions?sendNotificationEmail=false`, {
        method: "POST",
        body: JSON.stringify({ type: "user", role: "writer", emailAddress: email }),
      });
      done.add(email);
    } catch (e: any) {
      console.error("Drive chia sẻ lỗi", email, e?.message);
    }
  }
  const cur = readToken();
  if (cur) writeToken({ ...cur, sharedWith: Array.from(done) });
}

export async function ensureRootFolder(): Promise<string> {
  const t = readToken();
  if (!t) throw new Error("Chưa kết nối Google Drive");
  if (t.rootFolderId) {
    try {
      const f = await api(`/files/${t.rootFolderId}?fields=id,trashed`);
      if (!f.trashed) {
        if (SHARE_EMAILS.length) await shareFolder(t.rootFolderId, SHARE_EMAILS);
        return t.rootFolderId;
      }
    } catch {
      /* thư mục đã bị xóa, tạo lại */
    }
  }
  const id = await createFolder(ROOT_NAME);
  writeToken({ ...t, rootFolderId: id });
  if (SHARE_EMAILS.length) await shareFolder(id, SHARE_EMAILS);
  return id;
}

/* ---------------- Đồng bộ hồ sơ ---------------- */

function safe(s: string) {
  return (s || "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function slotLabel(key: string) {
  return FILE_SLOTS.find((s) => s.key === key)?.label || key;
}

function summaryText(n: Nomination): string {
  const ai: Partial<AiResult> = (n.aiResult ? safeParse<Partial<AiResult>>(n.aiResult) : {}) || {};
  const files = safeParse<StoredFile[]>(n.files) || [];
  const L = (k: string, v: any) => `${k}: ${v ?? ""}`;
  return [
    "TỔNG HỢP HỒ SƠ – GIẢI THƯỞNG “THANH NIÊN SỐNG ĐẸP” NĂM 2026",
    "",
    L("Mã hồ sơ", n.code),
    L("Thời điểm nộp", new Date(n.createdAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })),
    "",
    "I. ĐƠN VỊ ĐỀ CỬ",
    L("Tên đơn vị", n.nominatorName),
    L("Loại đơn vị", n.nominatorType),
    L("Người liên hệ", `${n.contactName} – ${n.contactPhone} – ${n.contactEmail}`),
    "",
    "II. CÁ NHÂN ĐƯỢC GIỚI THIỆU",
    L("Họ và tên", ai.hoTen || n.fullName),
    L("Ngày sinh", ai.ngaySinh || n.dob),
    L("Giới tính", n.gender),
    L("Dân tộc / Tôn giáo", `${n.ethnicity} / ${n.religion}`),
    L("Nơi cư trú", n.residence),
    L("Vị trí, nơi công tác", ai.viTriNoiCongTac || `${n.position} – ${n.workplace}`),
    L("Điện thoại / Email", `${n.candidatePhone} / ${n.candidateEmail}`),
    L("Nhóm đối tượng", n.candidateGroup === "can_bo_hoi" ? "Cán bộ Hội" : "Hội viên, thanh niên"),
    L("Lĩnh vực", n.field),
    "",
    "III. TÓM TẮT THÀNH TÍCH",
    (ai.tomTatThanhTich || n.summary || "").trim(),
    "",
    "IV. KHEN THƯỞNG",
    (ai.khenThuong || "").trim(),
    "",
    "V. NHẬN XÉT, ĐÁNH GIÁ SƠ BỘ (do hệ thống AI hỗ trợ tổng hợp)",
    (ai.nhanXetDanhGia || "").trim(),
    L("Tuổi tính đến 31/12/2026", ai.tuoiTinhDuoc ?? ""),
    L("Tuổi hợp lệ", ai.tuoiHopLe === true ? "Có" : ai.tuoiHopLe === false ? "Không" : "Chưa xác định"),
    L(
      "Đủ điều kiện thành tích",
      ai.duDieuKienThanhTich === true ? "Có" : ai.duDieuKienThanhTich === false ? "Không" : "Chưa xác định",
    ),
    L("Thành phần hồ sơ còn thiếu", (ai.hoSoThieu || []).join("; ")),
    "",
    "VI. DANH MỤC TỆP ĐÍNH KÈM",
    ...files.map((f, i) => `${i + 1}. [${slotLabel(f.slot)}] ${f.name} (${Math.round(f.size / 1024)} KB)`),
    "",
    "Ghi chú: phần nhận xét do AI tổng hợp chỉ mang tính hỗ trợ sơ loại, quyết định cuối cùng thuộc Hội đồng xét chọn.",
  ].join("\n");
}

function safeParse<T = any>(s: string | null): T | undefined {
  try {
    return s ? (JSON.parse(s) as T) : undefined;
  } catch {
    return undefined;
  }
}

/** Tạo thư mục riêng cho hồ sơ và tải toàn bộ tệp lên Drive. */
export async function syncNomination(id: number): Promise<{ folderId: string; folderUrl: string }> {
  const n = storage.get(id);
  if (!n) throw new Error("Không tìm thấy hồ sơ");
  const rootId = await ensureRootFolder();

  const uploaded = safeParse<Record<string, string>>((n as any).driveFiles) || {};
  let folderId = (n as any).driveFolderId as string | undefined;

  if (folderId) {
    try {
      const f = await api(`/files/${folderId}?fields=id,trashed`);
      if (f.trashed) folderId = undefined;
    } catch {
      folderId = undefined;
    }
  }
  if (!folderId) {
    const name = `${n.code} - ${safe(n.fullName)} - ${safe(n.nominatorName)}`;
    folderId = await createFolder(name, rootId);
  }

  const files = safeParse<StoredFile[]>(n.files) || [];
  const counters: Record<string, number> = {};
  for (const f of files) {
    if (uploaded[f.id]) continue;
    const p = path.join(UPLOAD_DIR, path.basename(f.id));
    if (!fs.existsSync(p)) continue;
    counters[f.slot] = (counters[f.slot] || 0) + 1;
    const idx = counters[f.slot];
    const ext = path.extname(f.name) || path.extname(f.id);
    const base = `${safe(slotLabel(f.slot))}${idx > 1 ? ` ${idx}` : ""}`;
    const up = await uploadFile({
      name: `${base}${ext}`,
      mime: f.mime,
      parentId: folderId,
      body: fs.readFileSync(p),
    });
    uploaded[f.id] = up.id;
  }

  // Tệp tổng hợp: ghi đè bản cũ nếu đã có
  const sumKey = "__summary__";
  const sumBuf = Buffer.from("\uFEFF" + summaryText(n), "utf8");
  if (uploaded[sumKey]) {
    try {
      const token = await accessToken();
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${uploaded[sumKey]}?uploadType=media`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "text/plain; charset=UTF-8" },
        body: sumBuf,
      });
    } catch {
      delete uploaded[sumKey];
    }
  }
  if (!uploaded[sumKey]) {
    const up = await uploadFile({
      name: `TONG-HOP-${n.code}.txt`,
      mime: "text/plain; charset=UTF-8",
      parentId: folderId,
      body: sumBuf,
    });
    uploaded[sumKey] = up.id;
  }

  const folderUrl = `https://drive.google.com/drive/folders/${folderId}`;
  storage.update(id, {
    driveFolderId: folderId,
    driveFolderUrl: folderUrl,
    driveFiles: JSON.stringify(uploaded),
    driveStatus: "xong",
    driveSyncedAt: new Date().toISOString(),
  } as any);
  return { folderId, folderUrl };
}

/** Đổi tên thư mục hồ sơ trên Drive (dùng khi quản trị sửa thông tin). */
export async function renameNominationFolder(id: number) {
  const n = storage.get(id);
  const folderId = (n as any)?.driveFolderId as string | undefined;
  if (!n || !folderId) return;
  const name = `${n.code} - ${safe(n.fullName)} - ${safe(n.nominatorName)}`;
  await api(`/files/${folderId}`, { method: "PATCH", body: JSON.stringify({ name }) });
}

/** Chuyển thư mục hồ sơ vào thùng rác Drive khi xóa hồ sơ. */
export async function trashNominationFolder(id: number) {
  if (!isConfigured() || !readToken()?.refreshToken) return;
  const n = storage.get(id);
  const folderId = (n as any)?.driveFolderId as string | undefined;
  if (!folderId) return;
  try {
    await api(`/files/${folderId}`, { method: "PATCH", body: JSON.stringify({ trashed: true }) });
  } catch (e: any) {
    console.error("Drive xóa thư mục lỗi", id, e?.message);
  }
}

/** Đồng bộ nền, tự ghi nhận lỗi để không làm gián đoạn việc nộp hồ sơ. */
export async function syncNominationSafe(id: number) {
  if (!isConfigured() || !readToken()?.refreshToken) return;
  try {
    storage.update(id, { driveStatus: "dang_chay" } as any);
    await syncNomination(id);
  } catch (e: any) {
    console.error("Drive đồng bộ lỗi", id, e?.message);
    storage.update(id, { driveStatus: `loi: ${String(e?.message || "").slice(0, 200)}` } as any);
  }
}
