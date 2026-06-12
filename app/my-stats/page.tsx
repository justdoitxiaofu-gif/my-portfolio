"use client";

import { useState, useCallback } from "react";

interface Visit {
  time: string;
  ref: string;
  ip: string;
  city: string;
  country: string;
  device: string;
  page: string;
}

export default function StatsPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"stats" | "links">("stats");

  // 链接生成器状态
  const [names, setNames] = useState("");
  const [generatedLinks, setGeneratedLinks] = useState<Array<{ name: string; link: string }>>([]);

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/track?key=${password}`);
      if (!res.ok) {
        alert("密码错误");
        return;
      }
      const data = await res.json();
      setVisits(data.visits);
      setTotal(data.total);
      setAuthenticated(true);
    } catch {
      alert("加载失败");
    } finally {
      setLoading(false);
    }
  }, [password]);

  const generateLinks = () => {
    const nameList = names
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean);
    
    const baseUrl = window.location.origin;
    const links = nameList.map((name) => ({
      name,
      link: `${baseUrl}?ref=${encodeURIComponent(name)}`,
    }));
    setGeneratedLinks(links);
  };

  const copyAllLinks = () => {
    const text = generatedLinks
      .map((item) => `${item.name}: ${item.link}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    alert("已复制所有链接到剪贴板！");
  };

  const copyOneLink = (link: string) => {
    navigator.clipboard.writeText(link);
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#0a0908] flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <h1 className="text-white text-xl mb-6 text-center">私密访问统计</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchVisits()}
            placeholder="输入访问密码"
            className="w-full px-4 py-3 bg-[#171411] border border-[#322c26] text-white rounded mb-4 outline-none focus:border-[#c9a961]"
          />
          <button
            onClick={fetchVisits}
            disabled={loading}
            className="w-full py-3 bg-[#c9a961] text-[#0a0908] font-medium rounded hover:bg-[#d4b56e] transition-colors"
          >
            {loading ? "验证中..." : "查看统计"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0908] text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-[#c9a961] mb-2">访问统计面板</h1>
        <p className="text-[#9a9185] text-sm mb-6">仅你可见 · 共 {total} 次访问记录</p>

        {/* Tab 切换 */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("stats")}
            className={`px-4 py-2 text-sm rounded transition-colors ${
              tab === "stats" ? "bg-[#c9a961] text-[#0a0908]" : "bg-[#171411] text-[#9a9185] hover:text-white"
            }`}
          >
            访问记录
          </button>
          <button
            onClick={() => setTab("links")}
            className={`px-4 py-2 text-sm rounded transition-colors ${
              tab === "links" ? "bg-[#c9a961] text-[#0a0908]" : "bg-[#171411] text-[#9a9185] hover:text-white"
            }`}
          >
            生成追踪链接
          </button>
          <button
            onClick={fetchVisits}
            className="ml-auto px-4 py-2 text-sm bg-[#171411] text-[#9a9185] hover:text-white rounded transition-colors"
          >
            刷新数据
          </button>
        </div>

        {tab === "stats" && (
          <>
            {/* 统计摘要 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-[#171411] border border-[#322c26] p-4 rounded">
                <div className="text-2xl font-bold text-[#c9a961]">{total}</div>
                <div className="text-xs text-[#9a9185] mt-1">总访问</div>
              </div>
              <div className="bg-[#171411] border border-[#322c26] p-4 rounded">
                <div className="text-2xl font-bold text-[#c9a961]">
                  {new Set(visits.map((v) => v.ref)).size}
                </div>
                <div className="text-xs text-[#9a9185] mt-1">不同来源</div>
              </div>
              <div className="bg-[#171411] border border-[#322c26] p-4 rounded">
                <div className="text-2xl font-bold text-[#c9a961]">
                  {new Set(visits.map((v) => v.ip)).size}
                </div>
                <div className="text-xs text-[#9a9185] mt-1">独立访客</div>
              </div>
              <div className="bg-[#171411] border border-[#322c26] p-4 rounded">
                <div className="text-2xl font-bold text-[#c9a961]">
                  {visits.filter((v) => v.ref !== "direct").length}
                </div>
                <div className="text-xs text-[#9a9185] mt-1">通过链接访问</div>
              </div>
            </div>

            {/* 按来源分组统计 */}
            <h2 className="text-lg text-white mb-3">按来源分组</h2>
            <div className="bg-[#171411] border border-[#322c26] rounded mb-8 overflow-hidden">
              {Object.entries(
                visits.reduce<Record<string, number>>((acc, v) => {
                  acc[v.ref] = (acc[v.ref] || 0) + 1;
                  return acc;
                }, {})
              )
                .sort(([, a], [, b]) => b - a)
                .map(([ref, count]) => (
                  <div key={ref} className="flex items-center justify-between px-4 py-3 border-b border-[#322c26] last:border-0">
                    <span className="text-sm text-white">{ref === "direct" ? "直接访问" : ref}</span>
                    <span className="text-sm text-[#c9a961] font-medium">{count} 次</span>
                  </div>
                ))}
              {visits.length === 0 && (
                <div className="px-4 py-8 text-center text-[#9a9185]">暂无访问记录</div>
              )}
            </div>

            {/* 详细访问日志 */}
            <h2 className="text-lg text-white mb-3">详细访问日志</h2>
            <div className="bg-[#171411] border border-[#322c26] rounded overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#322c26] text-[#9a9185]">
                    <th className="px-4 py-3 text-left">时间</th>
                    <th className="px-4 py-3 text-left">来源标记</th>
                    <th className="px-4 py-3 text-left">地区</th>
                    <th className="px-4 py-3 text-left">设备</th>
                    <th className="px-4 py-3 text-left">IP</th>
                    <th className="px-4 py-3 text-left">页面</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.slice(0, 100).map((visit, i) => (
                    <tr key={i} className="border-b border-[#322c26]/50 hover:bg-[#1a1714]">
                      <td className="px-4 py-2 text-[#9a9185] whitespace-nowrap">
                        {new Date(visit.time).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}
                      </td>
                      <td className="px-4 py-2">
                        <span className={visit.ref === "direct" ? "text-[#9a9185]" : "text-[#c9a961] font-medium"}>
                          {visit.ref === "direct" ? "直接访问" : visit.ref}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-[#9a9185]">{visit.city}, {visit.country}</td>
                      <td className="px-4 py-2 text-[#9a9185]">{visit.device}</td>
                      <td className="px-4 py-2 text-[#9a9185] font-mono text-xs">{visit.ip}</td>
                      <td className="px-4 py-2 text-[#9a9185]">{visit.page}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visits.length === 0 && (
                <div className="px-4 py-8 text-center text-[#9a9185]">暂无访问记录</div>
              )}
            </div>
          </>
        )}

        {tab === "links" && (
          <div className="space-y-6">
            <div className="bg-[#171411] border border-[#322c26] rounded p-6">
              <h2 className="text-lg text-white mb-2">批量生成追踪链接</h2>
              <p className="text-[#9a9185] text-sm mb-4">
                每行输入一个名字，为每个人生成独立的追踪链接。当他们点开链接时，你就能在访问记录中看到是谁来的。
              </p>
              <textarea
                value={names}
                onChange={(e) => setNames(e.target.value)}
                placeholder={"张三\n李四\n王总\n腾讯HR\n网易面试官\n..."}
                className="w-full h-48 px-4 py-3 bg-[#0a0908] border border-[#322c26] text-white rounded outline-none focus:border-[#c9a961] resize-none font-mono text-sm"
              />
              <button
                onClick={generateLinks}
                className="mt-4 px-6 py-3 bg-[#c9a961] text-[#0a0908] font-medium rounded hover:bg-[#d4b56e] transition-colors"
              >
                生成链接
              </button>
            </div>

            {generatedLinks.length > 0 && (
              <div className="bg-[#171411] border border-[#322c26] rounded p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg text-white">已生成 {generatedLinks.length} 个链接</h2>
                  <button
                    onClick={copyAllLinks}
                    className="px-4 py-2 text-sm bg-[#322c26] text-[#c9a961] rounded hover:bg-[#3d3529] transition-colors"
                  >
                    一键复制全部
                  </button>
                </div>
                <div className="space-y-2">
                  {generatedLinks.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 bg-[#0a0908] rounded border border-[#322c26]/50">
                      <span className="text-[#c9a961] font-medium min-w-[80px]">{item.name}</span>
                      <span className="text-[#9a9185] text-xs font-mono flex-1 truncate">{item.link}</span>
                      <button
                        onClick={() => copyOneLink(item.link)}
                        className="px-3 py-1 text-xs bg-[#322c26] text-[#9a9185] rounded hover:text-white transition-colors flex-shrink-0"
                      >
                        复制
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
