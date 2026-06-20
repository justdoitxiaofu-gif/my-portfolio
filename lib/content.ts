import fs from "node:fs";
import path from "node:path";
import type { Work, Section } from "@/lib/types";

const CONTENT_DIR = path.join(process.cwd(), "content");
const WORKS_DIR = path.join(CONTENT_DIR, "works");
const SECTIONS_DIR = path.join(CONTENT_DIR, "sections");
const SETTINGS_FILE = path.join(CONTENT_DIR, "settings", "site.json");

export interface SiteSettings {
  name: string;
  nameEn: string;
  title: string;
  description: string;
  tagline: string;
  email: string;
  phone: string;
  wechat: string;
  city: string;
  github: string;
  artstation: string;
  introContent: string;
}

const DEFAULT_SETTINGS: SiteSettings = {
  name: "牟怡夫",
  nameEn: "Mou Yifu",
  title: "Mou Yifu — 3D Character Artist Portfolio",
  description: "牟怡夫个人 CG 作品集 · 3D角色建模 / 写实雕刻 / 材质制作 · Game Art Portfolio",
  tagline: "3D Character / Realistic Sculpting / PBR Texturing",
  email: "justdoitxiaofu@gmail.com",
  phone: "13640555098",
  wechat: "justdoitxiaofu",
  city: "重庆",
  github: "https://github.com/yifumou",
  artstation: "https://www.artstation.com/yifumou",
  introContent: "",
};

function readJsonFilesFrom(dir: string): Record<string, unknown>[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b))
    .map((file) => {
      const raw = fs.readFileSync(path.join(dir, file), "utf-8");
      const data = JSON.parse(raw) as Record<string, unknown>;
      // 用文件名（去扩展名）作为 id 兜底，确保路由稳定
      const fallbackId = file.replace(/\.json$/, "");
      return { _file: fallbackId, ...data };
    });
}

function normalizeWork(raw: Record<string, unknown>): Work {
  const id = (raw.id as string) || (raw._file as string);
  // 多图画廊：images 数组优先；单图字段 image/image_url 作为兜底
  const imagesRaw = Array.isArray(raw.images) ? (raw.images as string[]).filter(Boolean) : [];
  const single = (raw.image as string) || (raw.image_url as string) || "";
  const images = imagesRaw.length > 0 ? imagesRaw : (single ? [single] : []);
  const image = images[0] || single || "";
  const thumb = (raw.thumb_url as string) || image;
  return {
    id,
    title: (raw.title as string) || "",
    description: (raw.description as string) || "",
    image_url: image,
    thumb_url: thumb,
    tags: (raw.tags as string[]) || [],
    software: (raw.software as string[]) || [],
    work_date: (raw.work_date as string) || "",
    pinned: Boolean(raw.pinned),
    image_size: (raw.image_size as number) ?? 0,
    sort_order: (raw.sort_order as number) ?? 0,
    size_weight: (raw.size_weight as number) ?? 1,
    created_at: (raw.created_at as string) || "",
    updated_at: (raw.updated_at as string) || "",
    image_count: images.length || 1,
    images,
  };
}

/**
 * 读取所有作品。
 * 排序规则：按 id 升序（与原 static-data 的数组顺序一致），
 * 这样首页 "精选/default" 模式下的展示顺序保持不变。
 */
export function getAllWorks(): Work[] {
  const works = readJsonFilesFrom(WORKS_DIR).map(normalizeWork);
  return works.sort((a, b) => a.id.localeCompare(b.id));
}

export function getWorkById(id: string): Work | null {
  return getAllWorks().find((w) => w.id === id) ?? null;
}

export function getAllSections(): Section[] {
  return readJsonFilesFrom(SECTIONS_DIR).map((raw) => ({
    id: (raw.id as string) || (raw._file as string),
    title: (raw.title as string) || "",
    content: (raw.content as string) || "",
  }));
}

export function getSiteSettings(): SiteSettings {
  if (!fs.existsSync(SETTINGS_FILE)) return DEFAULT_SETTINGS;
  const raw = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8")) as Partial<SiteSettings>;
  return { ...DEFAULT_SETTINGS, ...raw };
}
