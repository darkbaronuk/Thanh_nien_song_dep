import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import mammoth from "mammoth";
import sharp from "sharp";
import type { Nomination, StoredFile } from "@shared/schema";

const execFileAsync = promisify(execFile);
export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(process.env.DATA_DIR || process.cwd(), "uploads"));
const AI_MODEL = process.env.ANTHROPIC_MODEL || "claude_sonnet_4_6";
const AI_PROVIDER = (process.env.AI_PROVIDER || "anthropic").toLowerCase();
const VERTEX_MODEL = process.env.VERTEX_MODEL || "gemini-2.5-pro";
const VERTEX_LOCATION = process.env.GOOGLE_CLOUD_LOCATION || "global";

/** Gọi mô hình theo nhà cung cấp đã cấu hình, trả về văn bản trả lời. */
async function callModel(system: string, content: any[]): Promise<string> {
  if (AI_PROVIDER === "vertex") {
    const ai = new GoogleGenAI({
      vertexai: true,
      project: process.env.GOOGLE_CLOUD_PROJECT,
      location: VERTEX_LOCATION,
    });
    const parts = content.map((c) => {
      if (c.type === "text") return { text: c.text };
      return { inlineData: { mimeType: c.source.media_type, data: c.source.data } };
    });
    const res = await ai.models.generateContent({
      model: VERTEX_MODEL,
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: system,
        maxOutputTokens: 8192,
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    });
    return (res.text || "").trim();
  }

  const client = new Anthropic();
  const msg = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 3000,
    system,
    messages: [{ role: "user", content }],
  });
  return msg.content
    .filter((c: any) => c.type === "text")
    .map((c: any) => c.text)
    .join("\n")
    .trim();
}

const SLOT_LABEL: Record<string, string> = {
  cong_van: "Công văn đề nghị, giới thiệu",
  mau_m2: "Trích ngang lý lịch, thành tích (mẫu M2)",
  bao_cao: "Báo cáo thành tích có xác nhận",
  anh_chan_dung: "Ảnh chân dung",
  anh_hoat_dong: "Ảnh hoạt động",
  minh_chung: "Tài liệu chứng nhận thành tích / minh chứng",
};

/** Trích xuất văn bản từ tệp DOC/DOCX/TXT. Trả về chuỗi rỗng nếu không đọc được. */
async function extractDocText(filePath: string, name: string): Promise<string> {
  const ext = path.extname(name).toLowerCase();
  try {
    if (ext === ".docx") {
      const r = await mammoth.extractRawText({ path: filePath });
      return r.value || "";
    }
    if (ext === ".txt" || ext === ".rtf") {
      return fs.readFileSync(filePath, "utf8");
    }
    if (ext === ".doc") {
      const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "conv-"));
      const tmpIn = path.join(outDir, "in.doc");
      fs.copyFileSync(filePath, tmpIn);
      await execFileAsync(
        "soffice",
        ["--headless", "--convert-to", "txt:Text (encoded):UTF8", tmpIn, "--outdir", outDir],
        { timeout: 90_000 },
      );
      const txt = path.join(outDir, "in.txt");
      return fs.existsSync(txt) ? fs.readFileSync(txt, "utf8") : "";
    }
  } catch (e) {
    console.error("extractDocText", name, e);
  }
  return "";
}

async function imageBlock(filePath: string) {
  const buf = await sharp(filePath)
    .rotate()
    .resize({ width: 1500, height: 1500, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 78 })
    .toBuffer();
  return {
    type: "image" as const,
    source: { type: "base64" as const, media_type: "image/jpeg" as const, data: buf.toString("base64") },
  };
}

function pdfBlock(filePath: string) {
  const data = fs.readFileSync(filePath).toString("base64");
  return {
    type: "document" as const,
    source: { type: "base64" as const, media_type: "application/pdf" as const, data },
  };
}

function tuoiTinh(dob: string) {
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const ref = new Date("2026-12-31");
  let age = ref.getFullYear() - d.getFullYear();
  const m = ref.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < d.getDate())) age--;
  return age;
}

const SYSTEM = `Bạn là chuyên viên thẩm định hồ sơ của Văn phòng Trung ương Hội Liên hiệp Thanh niên Việt Nam, xét Giải thưởng "Thanh niên sống đẹp" năm 2026.

Nhiệm vụ: đọc (OCR) toàn bộ tài liệu đính kèm và thông tin do đơn vị đề cử khai báo, sau đó tổng hợp thành một bản ghi dữ liệu chuẩn.

Tiêu chuẩn xét giải cần đối chiếu:
- Hội viên, thanh niên Việt Nam trong và ngoài nước: từ 16 tuổi đến không quá 30 tuổi.
- Cán bộ Hội LHTN Việt Nam chuyên trách và không chuyên trách: từ 23 đến 35 tuổi; trường hợp đặc biệt không quá 40 tuổi do Hội đồng xem xét, quyết định.
- Cá nhân cần có ít nhất 02 năm gần nhất (2024, 2025) được nhận hình thức khen thưởng, trong đó ít nhất 01 năm được khen thưởng của Hội cấp trên trực tiếp.
- Hồ sơ hợp lệ gồm: công văn giới thiệu; trích ngang lý lịch - thành tích (mẫu M2); ảnh chân dung 3x4; 05-10 ảnh hoạt động; báo cáo thành tích có xác nhận; bản scan chứng nhận thành tích (nếu có).

Nguyên tắc:
- Chỉ dùng thông tin có trong tài liệu và khai báo. Không suy diễn, không bịa số quyết định.
- Nếu tài liệu mờ, thiếu hoặc không đọc được thì ghi rõ trong phần nhận xét.
- Viết bằng tiếng Việt, văn phong hành chính, ngắn gọn.
- Trả về DUY NHẤT một đối tượng JSON, không kèm giải thích hay markdown.

Cấu trúc JSON:
{
  "donViDeCu": string,
  "hoTen": string,
  "ngaySinh": string (dd/mm/yyyy),
  "viTriNoiCongTac": string,
  "tomTatThanhTich": string (3-6 câu, nêu thành tích nổi bật, số liệu cụ thể nếu có),
  "khenThuong": string (liệt kê từng hình thức khen thưởng: cấp khen - nội dung - số quyết định, ngày tháng, đơn vị cấp; mỗi mục xuống dòng bằng "\\n"),
  "nhanXetDanhGia": string (đánh giá tuổi có hợp lệ không theo đúng nhóm đối tượng, thành tích có đủ điều kiện không, hồ sơ còn thiếu gì, khuyến nghị),
  "tuoiHopLe": true|false|null,
  "tuoiTinhDuoc": number|null,
  "duDieuKienThanhTich": true|false|null,
  "hoSoThieu": string[],
  "doTinCay": "cao"|"trung bình"|"thấp"
}`;

export async function analyzeNomination(n: Nomination): Promise<any> {
  const files: StoredFile[] = JSON.parse(n.files || "[]");
  const age = tuoiTinh(n.dob);

  const content: any[] = [];
  const textParts: string[] = [];

  // Ưu tiên tài liệu văn bản, sau đó tới ảnh minh chứng, cuối cùng là ảnh hoạt động
  const priority = ["bao_cao", "mau_m2", "cong_van", "minh_chung", "anh_hoat_dong", "anh_chan_dung"];
  const sorted = [...files].sort((a, b) => priority.indexOf(a.slot) - priority.indexOf(b.slot));

  let imageBudget = 8;
  let pdfBudget = 5;

  for (const f of sorted) {
    const p = path.join(UPLOAD_DIR, f.id);
    if (!fs.existsSync(p)) continue;
    const label = `[${SLOT_LABEL[f.slot] || f.slot}] ${f.name}`;
    const ext = path.extname(f.name).toLowerCase();

    if ([".doc", ".docx", ".txt", ".rtf"].includes(ext)) {
      const t = (await extractDocText(p, f.name)).trim();
      if (t) textParts.push(`--- ${label} ---\n${t.slice(0, 12000)}`);
      else textParts.push(`--- ${label} ---\n(Không đọc được nội dung tệp)`);
    } else if (ext === ".pdf" && pdfBudget > 0 && f.size < 12 * 1024 * 1024) {
      pdfBudget--;
      content.push({ type: "text", text: `Tài liệu: ${label}` });
      content.push(pdfBlock(p));
    } else if ([".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic"].includes(ext) && imageBudget > 0) {
      imageBudget--;
      try {
        content.push({ type: "text", text: `Ảnh: ${label}` });
        content.push(await imageBlock(p));
      } catch {
        content.pop();
      }
    }
  }

  const khaiBao = `THÔNG TIN ĐƠN VỊ ĐỀ CỬ KHAI BÁO
- Đơn vị đề cử: ${n.nominatorName} (${n.nominatorType})
- Người liên hệ: ${n.contactName} - ${n.contactPhone} - ${n.contactEmail}
- Họ và tên cá nhân được giới thiệu: ${n.fullName}
- Ngày sinh: ${n.dob} (tuổi tính đến 31/12/2026: ${age ?? "không xác định"})
- Giới tính: ${n.gender} | Dân tộc: ${n.ethnicity} | Tôn giáo: ${n.religion}
- Nơi thường trú: ${n.residence}
- Nơi công tác: ${n.workplace} | Chức vụ: ${n.position}
- Nhóm đối tượng: ${n.candidateGroup === "can_bo_hoi" ? "Cán bộ Hội LHTN Việt Nam (23-35 tuổi, đặc biệt không quá 40)" : "Hội viên, thanh niên Việt Nam (16 - dưới 30 tuổi)"}
- Lĩnh vực: ${n.field}
- Tóm tắt do đơn vị cung cấp: ${n.summary || "(không có)"}
- Thành phần hồ sơ đã nộp: ${
    files.length
      ? Object.entries(
          files.reduce<Record<string, number>>((acc, f) => {
            acc[SLOT_LABEL[f.slot] || f.slot] = (acc[SLOT_LABEL[f.slot] || f.slot] || 0) + 1;
            return acc;
          }, {}),
        )
          .map(([k, v]) => `${k} (${v} tệp)`)
          .join("; ")
      : "chưa có tệp"
  }`;

  content.unshift({
    type: "text",
    text: `${khaiBao}\n\n${textParts.length ? "NỘI DUNG TÀI LIỆU ĐÍNH KÈM (đã trích xuất):\n\n" + textParts.join("\n\n") : ""}`,
  });
  content.push({
    type: "text",
    text: "Hãy OCR toàn bộ ảnh/tài liệu ở trên và trả về JSON tổng hợp theo đúng cấu trúc đã quy định.",
  });

  const raw = await callModel(SYSTEM, content);

  const jsonText = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = jsonText.indexOf("{");
  const end = jsonText.lastIndexOf("}");
  const parsed = JSON.parse(jsonText.slice(start, end + 1));
  if (parsed.tuoiTinhDuoc == null) parsed.tuoiTinhDuoc = age;
  return parsed;
}
