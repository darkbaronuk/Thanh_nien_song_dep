import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const nominations = sqliteTable("nominations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull(),
  createdAt: text("created_at").notNull(),

  // Đơn vị đề cử
  nominatorType: text("nominator_type").notNull(),
  nominatorName: text("nominator_name").notNull(),
  contactName: text("contact_name").notNull(),
  contactPhone: text("contact_phone").notNull(),
  contactEmail: text("contact_email").notNull(),

  // Cá nhân được giới thiệu
  fullName: text("full_name").notNull(),
  dob: text("dob").notNull(),
  gender: text("gender").notNull().default(""),
  ethnicity: text("ethnicity").notNull().default(""),
  religion: text("religion").notNull().default(""),
  residence: text("residence").notNull().default(""),
  workplace: text("workplace").notNull().default(""),
  position: text("position").notNull().default(""),
  candidatePhone: text("candidate_phone").notNull().default(""),
  candidateEmail: text("candidate_email").notNull().default(""),
  candidateGroup: text("candidate_group").notNull(), // hoi_vien | can_bo_hoi
  field: text("field").notNull(), // 1 trong 6 lĩnh vực
  summary: text("summary").notNull().default(""), // tóm tắt do đơn vị nhập

  // Hồ sơ đính kèm (JSON text)
  files: text("files").notNull().default("[]"),

  // Xử lý
  status: text("status").notNull().default("moi"), // moi | dang_xet | dat | khong_dat
  aiStatus: text("ai_status").notNull().default("chua"), // chua | dang_chay | xong | loi
  aiResult: text("ai_result"), // JSON
  reviewerNote: text("reviewer_note").notNull().default(""),

  // Đồng bộ Google Drive
  driveFolderId: text("drive_folder_id").notNull().default(""),
  driveFolderUrl: text("drive_folder_url").notNull().default(""),
  driveFiles: text("drive_files").notNull().default("{}"),
  driveStatus: text("drive_status").notNull().default("chua"),
  driveSyncedAt: text("drive_synced_at").notNull().default(""),
});

export type Nomination = typeof nominations.$inferSelect;
export type InsertNomination = typeof nominations.$inferInsert;

export type StoredFile = {
  id: string;
  slot: string; // cong_van | mau_m2 | anh_chan_dung | anh_hoat_dong | bao_cao | minh_chung
  name: string;
  mime: string;
  size: number;
};

export type AiResult = {
  donViDeCu: string;
  hoTen: string;
  ngaySinh: string;
  viTriNoiCongTac: string;
  tomTatThanhTich: string;
  khenThuong: string;
  nhanXetDanhGia: string;
  tuoiHopLe: boolean | null;
  tuoiTinhDuoc: number | null;
  duDieuKienThanhTich: boolean | null;
  hoSoThieu: string[];
  doTinCay: string;
};

export const NOMINATOR_TYPES = [
  "Ban Thư ký Hội LHTN Việt Nam tỉnh, thành phố",
  "Đơn vị trực thuộc Trung ương Hội LHTN Việt Nam",
  "Ban Thanh niên Công an Nhân dân",
  "Ban Thanh niên Quân đội",
  "Đoàn Thanh niên Chính phủ",
  "Đoàn Thanh niên các cơ quan Đảng Trung ương",
  "Đoàn Thanh niên MTTQ và các đoàn thể Trung ương",
  "Đoàn Thanh niên Quốc hội",
  "Cơ quan thông tấn, báo chí của Đoàn, Hội",
] as const;

export const FIELDS = [
  "Học tập và làm theo tư tưởng, đạo đức, phong cách Hồ Chí Minh",
  "Tình nguyện, an sinh xã hội",
  "Chiến đấu, bảo vệ Tổ quốc; giữ gìn an ninh trật tự, an toàn xã hội",
  "Lao động sản xuất, kinh doanh, phát triển kinh tế",
  "Giảng dạy, giáo dục",
  "Văn hóa - nghệ thuật, thể dục - thể thao",
] as const;

export const CANDIDATE_GROUPS = [
  { value: "hoi_vien", label: "Hội viên, thanh niên Việt Nam (16 - dưới 30 tuổi)" },
  { value: "can_bo_hoi", label: "Cán bộ Hội LHTN Việt Nam (23 - 35 tuổi, đặc biệt không quá 40)" },
] as const;

export const FILE_SLOTS = [
  {
    key: "cong_van",
    label: "Công văn đề nghị, giới thiệu",
    hint: "Bản scan công văn có dấu của đơn vị đề cử (PDF/ảnh).",
    required: true,
    max: 3,
  },
  {
    key: "mau_m2",
    label: "Trích ngang lý lịch, thành tích (mẫu M2)",
    hint: "Điền theo mẫu M2, tải mẫu ở nút bên cạnh (DOC/PDF).",
    required: true,
    max: 2,
  },
  {
    key: "bao_cao",
    label: "Báo cáo thành tích có xác nhận",
    hint: "Có xác nhận của đơn vị phụ trách / chính quyền địa phương / nhà trường, theo mẫu.",
    required: true,
    max: 3,
  },
  {
    key: "anh_chan_dung",
    label: "Ảnh chân dung 3x4",
    hint: "Ảnh màu, nền sáng, định dạng JPG/PNG.",
    required: true,
    max: 1,
  },
  {
    key: "anh_hoat_dong",
    label: "05 đến 10 ảnh hoạt động của cá nhân",
    hint: "Ảnh hoạt động thực tế, tối thiểu 05 ảnh, tối đa 10 ảnh.",
    required: true,
    min: 5,
    max: 10,
  },
  {
    key: "minh_chung",
    label: "Bản scan hồ sơ chứng nhận thành tích, tài liệu liên quan",
    hint: "Bằng khen, giấy khen, quyết định, bài báo, hình ảnh minh họa hành vi sống đẹp (nếu có).",
    required: false,
    max: 15,
  },
] as const;
