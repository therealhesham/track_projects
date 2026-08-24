"use client";

import { useState, useEffect, useTransition } from "react";
import { updateProjectGithubUrl } from "@/app/actions";
import {
  GitCommit,
  GitBranch,
  ExternalLink,
  RefreshCw,
  Search,
  Copy,
  Check,
  Link2,
  Edit3,
  AlertCircle,
  Code2,
  Calendar,
  User,
} from "lucide-react";

function GithubIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export type CommitItem = {
  sha: string;
  html_url: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
  author: {
    login: string;
    avatar_url: string;
    html_url: string;
  } | null;
};

export function parseGithubRepo(url: string | null): { owner: string; repo: string } | null {
  if (!url) return null;
  const clean = url.trim().replace(/\/+$/, "").replace(/\.git$/, "");
  
  // Pattern 1: https://github.com/owner/repo
  const matchUrl = clean.match(/github\.com\/([^/]+)\/([^/]+)/i);
  if (matchUrl) {
    return { owner: matchUrl[1], repo: matchUrl[2] };
  }

  // Pattern 2: owner/repo
  const matchOwnerRepo = clean.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
  if (matchOwnerRepo) {
    return { owner: matchOwnerRepo[1], repo: matchOwnerRepo[2] };
  }

  return null;
}

function formatArabicRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffSecs = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSecs < 60) return "الآن";
  const mins = Math.floor(diffSecs / 60);
  if (mins < 60) return `قبل ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `قبل ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `قبل ${days} يوم`;
  
  return date.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function GithubCommitsTab({
  projectId,
  githubUrl,
  canEdit = false,
}: {
  projectId: string;
  githubUrl: string | null;
  canEdit?: boolean;
}) {
  const repoInfo = parseGithubRepo(githubUrl);

  const [inputUrl, setInputUrl] = useState(githubUrl || "");
  const [editingUrl, setEditingUrl] = useState(!githubUrl);
  const [savingUrl, startSaveTransition] = useTransition();

  const [branch, setBranch] = useState("main");
  const [commits, setCommits] = useState<CommitItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedSha, setCopiedSha] = useState<string | null>(null);

  const fetchCommits = async () => {
    if (!repoInfo) return;
    setLoading(true);
    setError(null);

    try {
      // Try main first, fallback to master if main fails
      let res = await fetch(
        `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/commits?sha=${branch}&per_page=30`
      );

      if (!res.ok && branch === "main") {
        // Fallback check for master branch
        const fallbackRes = await fetch(
          `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/commits?sha=master&per_page=30`
        );
        if (fallbackRes.ok) {
          res = fallbackRes;
          setBranch("master");
        }
      }

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("المستودع غير موجود أو قد يكون خاصاً (Private). تأكد من صحة الرابط.");
        } else if (res.status === 403) {
          throw new Error("تم تجاوز حد الطلبات المسموح به لـ GitHub API حالياً. حاول بعد قليل.");
        } else {
          throw new Error(`تعذر جلب التحديثات (رمز الخطأ: ${res.status})`);
        }
      }

      const data = await res.json();
      if (Array.isArray(data)) {
        setCommits(data);
      } else {
        setCommits([]);
      }
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء جلب الـ Commits");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (repoInfo) {
      fetchCommits();
    }
  }, [githubUrl, branch]);

  const handleSaveUrl = () => {
    const clean = inputUrl.trim();
    startSaveTransition(async () => {
      const res = await updateProjectGithubUrl({
        projectId,
        githubUrl: clean || null,
      });
      if (res.ok) {
        setEditingUrl(false);
      }
    });
  };

  const copyToClipboard = (sha: string) => {
    navigator.clipboard.writeText(sha);
    setCopiedSha(sha);
    setTimeout(() => setCopiedSha(null), 2000);
  };

  const filteredCommits = commits.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const msg = (item.commit?.message || "").toLowerCase();
    const author = (item.commit?.author?.name || "").toLowerCase();
    const sha = item.sha.toLowerCase();
    return msg.includes(q) || author.includes(q) || sha.includes(q);
  });

  return (
    <div className="flex flex-col gap-6">
      {/* ── Top GitHub Link Banner / Configuration ── */}
      <div className="rounded-2xl border border-ink/10 bg-paper p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink/5 text-ink">
              <GithubIcon className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[16px] font-bold text-ink">
                  مستودع الكود على GitHub
                </h3>
                {repoInfo && (
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600">
                    متصل
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[12px] text-ink/50">
                {repoInfo
                  ? `${repoInfo.owner}/${repoInfo.repo}`
                  : "ربط المشروع بمستودع GitHub لعرض أحدث الـ Commits وتحديثات الكود تلقائياً"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {repoInfo && !editingUrl && (
              <a
                href={`https://github.com/${repoInfo.owner}/${repoInfo.repo}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-ink/15 bg-paper px-3.5 py-2 text-[12px] font-semibold text-ink transition hover:bg-ink/5"
              >
                <span>فتح في GitHub</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}

            {canEdit && !editingUrl && (
              <button
                type="button"
                onClick={() => setEditingUrl(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-ink/15 bg-paper px-3.5 py-2 text-[12px] font-semibold text-ink transition hover:bg-ink/5"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>تعديل الرابط</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Edit / Input URL Form ── */}
        {(editingUrl || !githubUrl) && (
          <div className="mt-4 flex flex-col gap-3 border-t border-ink/8 pt-4">
            <label className="text-[12px] font-medium text-ink/60">
              أدخل رابط مستودع GitHub الخاص بالمشروع:
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[260px]">
                <Link2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35 pointer-events-none" />
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https://github.com/owner/repository"
                  className="w-full rounded-xl border border-ink/15 bg-paper pr-10 pl-4 py-2 text-[13px] text-ink outline-none transition focus:border-accent"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveUrl}
                disabled={savingUrl}
                className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-5 py-2 text-[13px] font-semibold text-white shadow-xs transition hover:bg-accent-600 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                <span>{savingUrl ? "جارٍ الحفظ…" : "حفظ الرابط"}</span>
              </button>

              {githubUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setInputUrl(githubUrl);
                    setEditingUrl(false);
                  }}
                  className="rounded-xl border border-ink/15 px-3.5 py-2 text-[12px] font-medium text-ink/60 hover:bg-ink/5"
                >
                  إلغاء
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Commits View ── */}
      {repoInfo ? (
        <div className="flex flex-col gap-4">
          {/* Controls Bar: Search, Branch, Refresh */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Search Box */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث في رسائل الـ Commits أو اسم المطور..."
                className="w-full rounded-xl border border-ink/15 bg-paper pr-9 pl-4 py-2 text-[13px] text-ink outline-none transition focus:border-accent"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Branch Selector */}
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-ink/15 bg-paper px-3 py-1.5 text-[12px] font-semibold text-ink">
                <GitBranch className="h-3.5 w-3.5 text-accent" />
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="bg-transparent font-mono text-[12px] text-ink outline-none cursor-pointer"
                >
                  <option value="main">main</option>
                  <option value="master">master</option>
                  <option value="dev">dev</option>
                </select>
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={fetchCommits}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-ink/15 bg-paper px-3.5 py-2 text-[12px] font-semibold text-ink transition hover:bg-ink/5 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-accent" : ""}`} />
                <span>تحديث</span>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && commits.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-accent mb-3" />
              <p className="text-[14px] font-semibold text-ink">جارٍ جلب التحديثات من GitHub…</p>
            </div>
          )}

          {/* Commits List */}
          {!loading && filteredCommits.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-ink/10 bg-paper shadow-xs divide-y divide-ink/6">
              {filteredCommits.map((item) => {
                const messageLines = (item.commit?.message || "").split("\n");
                const headline = messageLines[0];
                const body = messageLines.slice(1).join("\n").trim();
                const authorName = item.commit?.author?.name || item.author?.login || "مطور غير معروف";
                const avatarUrl = item.author?.avatar_url;
                const shortSha = item.sha.substring(0, 7);
                const relativeTime = item.commit?.author?.date
                  ? formatArabicRelativeTime(item.commit.author.date)
                  : "";

                return (
                  <div
                    key={item.sha}
                    className="flex flex-wrap items-start justify-between gap-4 p-4 transition hover:bg-ink/[0.02]"
                  >
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      {/* Avatar / Icon */}
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={authorName}
                          className="h-9 w-9 rounded-full border border-ink/10 shrink-0 mt-0.5"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent font-bold text-xs shrink-0 mt-0.5">
                          {authorName.charAt(0).toUpperCase()}
                        </div>
                      )}

                      {/* Commit Message & Author info */}
                      <div className="flex flex-col min-w-0">
                        <a
                          href={item.html_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[14px] font-bold text-ink hover:text-accent leading-snug break-words"
                        >
                          {headline}
                        </a>

                        {body && (
                          <p className="mt-1 text-[12px] text-ink/60 whitespace-pre-wrap font-mono bg-ink/5 p-2 rounded-lg leading-relaxed max-h-24 overflow-y-auto">
                            {body}
                          </p>
                        )}

                        <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-ink/50">
                          <span className="inline-flex items-center gap-1 font-semibold text-ink/75">
                            <User className="h-3.5 w-3.5 text-ink/40" />
                            {authorName}
                          </span>

                          {relativeTime && (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-ink/40" />
                              {relativeTime}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Commit Hash SHA & Link */}
                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(shortSha)}
                        title="نسخ رقم الـ Commit"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-ink/15 bg-paper px-2.5 py-1 font-mono text-[12px] font-bold text-ink transition hover:bg-ink/5"
                      >
                        <GitCommit className="h-3.5 w-3.5 text-accent" />
                        <span>{shortSha}</span>
                        {copiedSha === shortSha ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Copy className="h-3 w-3 text-ink/40" />
                        )}
                      </button>

                      <a
                        href={item.html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-ink/15 text-ink/60 transition hover:bg-ink/5 hover:text-ink"
                        title="عرض التغييرات على GitHub"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty Commits State */}
          {!loading && !error && filteredCommits.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-ink/10 bg-paper py-14 text-center">
              <Code2 className="h-10 w-10 text-ink/30 mb-2" />
              <h4 className="text-[15px] font-bold text-ink">لا توجد Commits للعرض</h4>
              <p className="mt-1 text-[12px] text-ink/50">
                {searchQuery ? "لم يتم العثور على نتائج تطابق البحث" : "المستودع قد يكون فارغاً أو في فرع آخر."}
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
