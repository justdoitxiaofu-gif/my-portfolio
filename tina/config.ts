import { defineConfig } from "tinacms";

// 分支：本地用 master，Vercel 部署时自动读取
const branch =
  process.env.GITHUB_BRANCH ||
  process.env.VERCEL_GIT_COMMIT_REF ||
  process.env.HEAD ||
  "master";

export default defineConfig({
  branch,
  clientId: process.env.NEXT_PUBLIC_TINA_CLIENT_ID || "",
  token: process.env.TINA_TOKEN || "",

  build: {
    outputFolder: "admin",
    publicFolder: "public",
  },
  media: {
    tina: {
      mediaRoot: "works",
      publicFolder: "public",
    },
  },

  schema: {
    collections: [
      // ===== 作品集 =====
      {
        name: "works",
        label: "作品集",
        path: "content/works",
        format: "json",
        ui: {
          filename: {
            readonly: false,
            slugify: (values) => {
              return `${(values?.title || "work").toString().slice(0, 20)}`;
            },
          },
        },
        fields: [
          {
            type: "string",
            name: "title",
            label: "作品标题",
            isTitle: true,
            required: true,
          },
          {
            type: "string",
            name: "description",
            label: "作品描述",
            ui: { component: "textarea" },
          },
          {
            type: "image",
            name: "image",
            label: "封面图片（列表展示用）",
            required: true,
          },
          {
            type: "image",
            name: "images",
            label: "作品图集（详情页画廊，可多张，第一张通常同封面）",
            list: true,
          },
          {
            type: "string",
            name: "tags",
            label: "分类标签（可多个，回车添加）",
            list: true,
          },
          {
            type: "string",
            name: "software",
            label: "使用软件（可多个，回车添加）",
            list: true,
          },
          {
            type: "string",
            name: "work_date",
            label: "创作年份",
          },
          {
            type: "boolean",
            name: "pinned",
            label: "是否置顶/精选",
          },
          {
            type: "number",
            name: "sort_order",
            label: "排序权重（数字越大越靠前）",
          },
          {
            type: "number",
            name: "size_weight",
            label: "卡片大小（1.5=大, 1.0=中, 0.7=小）",
          },
        ],
      },

      // ===== 经历/介绍段落 =====
      {
        name: "sections",
        label: "经历介绍",
        path: "content/sections",
        format: "json",
        fields: [
          {
            type: "string",
            name: "title",
            label: "标题（如：工作经历）",
            isTitle: true,
            required: true,
          },
          {
            type: "string",
            name: "content",
            label: "内容（用 **文字** 表示加粗，换行直接回车）",
            ui: { component: "textarea" },
          },
        ],
      },

      // ===== 个人信息（单例）=====
      {
        name: "settings",
        label: "个人信息设置",
        path: "content/settings",
        format: "json",
        ui: {
          allowedActions: {
            create: false,
            delete: false,
          },
        },
        fields: [
          { type: "string", name: "name", label: "中文名" },
          { type: "string", name: "nameEn", label: "英文名" },
          { type: "string", name: "tagline", label: "副标题（英文标语）" },
          {
            type: "string",
            name: "introContent",
            label: "首页介绍文字（换行直接回车）",
            ui: { component: "textarea" },
          },
          { type: "string", name: "email", label: "邮箱" },
          { type: "string", name: "phone", label: "电话" },
          { type: "string", name: "wechat", label: "微信号" },
          { type: "string", name: "city", label: "城市" },
          { type: "string", name: "github", label: "GitHub 链接" },
          { type: "string", name: "artstation", label: "ArtStation 链接" },
          { type: "string", name: "title", label: "网页标题（SEO）" },
          { type: "string", name: "description", label: "网页描述（SEO）" },
        ],
      },
    ],
  },
});
