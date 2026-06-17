// tina/config.ts
import { defineConfig } from "tinacms";
var branch = process.env.GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || process.env.HEAD || "master";
var config_default = defineConfig({
  branch,
  clientId: process.env.NEXT_PUBLIC_TINA_CLIENT_ID || "",
  token: process.env.TINA_TOKEN || "",
  build: {
    outputFolder: "admin",
    publicFolder: "public"
  },
  media: {
    tina: {
      mediaRoot: "works",
      publicFolder: "public"
    }
  },
  schema: {
    collections: [
      // ===== 作品集 =====
      {
        name: "works",
        label: "\u4F5C\u54C1\u96C6",
        path: "content/works",
        format: "json",
        ui: {
          filename: {
            readonly: false,
            slugify: (values) => {
              return `${(values?.title || "work").toString().slice(0, 20)}`;
            }
          }
        },
        fields: [
          {
            type: "string",
            name: "title",
            label: "\u4F5C\u54C1\u6807\u9898",
            isTitle: true,
            required: true
          },
          {
            type: "string",
            name: "description",
            label: "\u4F5C\u54C1\u63CF\u8FF0",
            ui: { component: "textarea" }
          },
          {
            type: "image",
            name: "image",
            label: "\u4F5C\u54C1\u56FE\u7247",
            required: true
          },
          {
            type: "string",
            name: "tags",
            label: "\u5206\u7C7B\u6807\u7B7E\uFF08\u53EF\u591A\u4E2A\uFF0C\u56DE\u8F66\u6DFB\u52A0\uFF09",
            list: true
          },
          {
            type: "string",
            name: "software",
            label: "\u4F7F\u7528\u8F6F\u4EF6\uFF08\u53EF\u591A\u4E2A\uFF0C\u56DE\u8F66\u6DFB\u52A0\uFF09",
            list: true
          },
          {
            type: "string",
            name: "work_date",
            label: "\u521B\u4F5C\u5E74\u4EFD"
          },
          {
            type: "boolean",
            name: "pinned",
            label: "\u662F\u5426\u7F6E\u9876/\u7CBE\u9009"
          },
          {
            type: "number",
            name: "sort_order",
            label: "\u6392\u5E8F\u6743\u91CD\uFF08\u6570\u5B57\u8D8A\u5927\u8D8A\u9760\u524D\uFF09"
          },
          {
            type: "number",
            name: "size_weight",
            label: "\u5361\u7247\u5927\u5C0F\uFF081.5=\u5927, 1.0=\u4E2D, 0.7=\u5C0F\uFF09"
          }
        ]
      },
      // ===== 经历/介绍段落 =====
      {
        name: "sections",
        label: "\u7ECF\u5386\u4ECB\u7ECD",
        path: "content/sections",
        format: "json",
        fields: [
          {
            type: "string",
            name: "title",
            label: "\u6807\u9898\uFF08\u5982\uFF1A\u5DE5\u4F5C\u7ECF\u5386\uFF09",
            isTitle: true,
            required: true
          },
          {
            type: "string",
            name: "content",
            label: "\u5185\u5BB9\uFF08\u7528 **\u6587\u5B57** \u8868\u793A\u52A0\u7C97\uFF0C\u6362\u884C\u76F4\u63A5\u56DE\u8F66\uFF09",
            ui: { component: "textarea" }
          }
        ]
      },
      // ===== 个人信息（单例）=====
      {
        name: "settings",
        label: "\u4E2A\u4EBA\u4FE1\u606F\u8BBE\u7F6E",
        path: "content/settings",
        format: "json",
        ui: {
          allowedActions: {
            create: false,
            delete: false
          }
        },
        fields: [
          { type: "string", name: "name", label: "\u4E2D\u6587\u540D" },
          { type: "string", name: "nameEn", label: "\u82F1\u6587\u540D" },
          { type: "string", name: "tagline", label: "\u526F\u6807\u9898\uFF08\u82F1\u6587\u6807\u8BED\uFF09" },
          {
            type: "string",
            name: "introContent",
            label: "\u9996\u9875\u4ECB\u7ECD\u6587\u5B57\uFF08\u6362\u884C\u76F4\u63A5\u56DE\u8F66\uFF09",
            ui: { component: "textarea" }
          },
          { type: "string", name: "email", label: "\u90AE\u7BB1" },
          { type: "string", name: "phone", label: "\u7535\u8BDD" },
          { type: "string", name: "wechat", label: "\u5FAE\u4FE1\u53F7" },
          { type: "string", name: "city", label: "\u57CE\u5E02" },
          { type: "string", name: "github", label: "GitHub \u94FE\u63A5" },
          { type: "string", name: "artstation", label: "ArtStation \u94FE\u63A5" },
          { type: "string", name: "title", label: "\u7F51\u9875\u6807\u9898\uFF08SEO\uFF09" },
          { type: "string", name: "description", label: "\u7F51\u9875\u63CF\u8FF0\uFF08SEO\uFF09" }
        ]
      }
    ]
  }
});
export {
  config_default as default
};
