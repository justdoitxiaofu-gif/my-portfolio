import { NextRequest, NextResponse } from "next/server";

// 使用 Vercel KV 或内存存储访问记录
// 在 Vercel 部署时，用 Edge Runtime 获取真实 IP
// 数据存储在全局变量中（Serverless 函数有冷启动，所以同时写入 Vercel KV）
// 简化版：先用全局变量 + JSON 文件模拟，后续可接入真实数据库

const VISITS_KEY = "portfolio_visits";

// 从 Vercel 的全局 KV 中获取数据（简化版用内存）
let visitsCache: Array<{
  time: string;
  ref: string;
  ip: string;
  city: string;
  country: string;
  device: string;
  page: string;
  ua: string;
}> = [];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ref = body.ref || "direct";
    const page = body.page || "/";

    // 获取访客信息
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
      || request.headers.get("x-real-ip") 
      || "unknown";
    const city = request.headers.get("x-vercel-ip-city") || "unknown";
    const country = request.headers.get("x-vercel-ip-country") || "unknown";
    const ua = request.headers.get("user-agent") || "unknown";
    
    // 简单判断设备类型
    const isMobile = /Mobile|Android|iPhone/i.test(ua);
    const device = isMobile ? "手机" : "电脑";

    const visit = {
      time: new Date().toISOString(),
      ref,
      ip: ip.replace(/(\d+\.\d+\.\d+)\.\d+/, "$1.***"), // 隐藏最后一段IP
      city: decodeURIComponent(city),
      country,
      device,
      page,
      ua: ua.substring(0, 100),
    };

    visitsCache.push(visit);
    
    // 只保留最近 500 条记录
    if (visitsCache.length > 500) {
      visitsCache = visitsCache.slice(-500);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  // 简单密码验证 - 只有你知道这个密钥
  const key = request.nextUrl.searchParams.get("key");
  if (key !== "mouyifu2026") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    total: visitsCache.length,
    visits: visitsCache.slice().reverse(), // 最新的在前面
  });
}
