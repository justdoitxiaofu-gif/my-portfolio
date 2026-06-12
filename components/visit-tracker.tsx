"use client";

import { useEffect } from "react";

export default function VisitTracker() {
  useEffect(() => {
    // 获取 URL 中的 ref 参数（用于追踪谁点击了链接）
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref") || "direct";
    const page = window.location.pathname;

    // 避免重复记录同一次会话
    const sessionKey = `tracked_${page}_${ref}`;
    if (sessionStorage.getItem(sessionKey)) return;

    // 发送追踪请求
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref, page }),
    }).then(() => {
      sessionStorage.setItem(sessionKey, "1");
    }).catch(() => {
      // 静默失败，不影响用户体验
    });
  }, []);

  return null; // 不渲染任何可见内容
}
