"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Link from "next/link";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
import BackLink from "@/components/back-link";
import type { Profile } from "@/lib/profiles";
import { getSupabaseClient } from "@/lib/supabase";
import { useDemoAuth } from "@/lib/use-demo-auth";
import { useLanguage } from "@/components/language-provider";
import { localizedError } from "@/lib/messages";

type AdminItem = {
  id: string;
  title: string;
  type: "lost" | "found";
  status: "active" | "returned" | "hidden";
  created_at: string;
  profiles: { username: string } | null;
};

type AdminReport = {
  id: string;
  item_id: string;
  reason: string;
  status: "open" | "reviewed" | "dismissed";
  created_at: string;
  items: { title: string } | null;
};

type AdminDailyStat = {
  day: string;
  users_created: number;
  listings_created: number;
  reports_created: number;
};

type AdminAuditEntry = {
  id: string;
  actor_username: string;
  action: string;
  target_type: "user" | "listing" | "report";
  target_id: string | null;
  target_label: string;
  status: "pending" | "succeeded" | "failed";
  created_at: string;
};

type AdminAuditMeta = {
  action: string;
  targetType: AdminAuditEntry["target_type"];
  targetId: string;
  targetLabel: string;
};

type AdminSection = "overview" | "users" | "listings" | "reports" | "activity";

const auditActionKeys: Record<string, string> = {
  user_verified: "admin.audit.action.userVerified",
  user_unverified: "admin.audit.action.userUnverified",
  user_blocked: "admin.audit.action.userBlocked",
  user_unblocked: "admin.audit.action.userUnblocked",
  admin_granted: "admin.audit.action.adminGranted",
  admin_removed: "admin.audit.action.adminRemoved",
  listing_hidden: "admin.audit.action.listingHidden",
  listing_shown: "admin.audit.action.listingShown",
  listing_deleted: "admin.audit.action.listingDeleted",
  report_reviewed: "admin.audit.action.reportReviewed",
  report_dismissed: "admin.audit.action.reportDismissed",
  report_reopened: "admin.audit.action.reportReopened",
  report_deleted: "admin.audit.action.reportDeleted",
};

export default function AdminDashboard({ section }: { section: AdminSection }) {
  const { user, isReady } = useDemoAuth();
  const { language, t } = useLanguage();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [items, setItems] = useState<AdminItem[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [metrics, setMetrics] = useState({
    users: 0,
    items: 0,
    reports: 0,
    returned: 0,
    activeItems: 0,
    openReports: 0,
  });
  const [periodDays, setPeriodDays] = useState<7 | 30 | 90>(7);
  const [dailyStats, setDailyStats] = useState<AdminDailyStat[]>([]);
  const [auditEntries, setAuditEntries] = useState<AdminAuditEntry[]>([]);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditStatusFilter, setAuditStatusFilter] = useState<"all" | AdminAuditEntry["status"]>("all");
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<"all" | "admin" | "user">("all");
  const [userStatusFilter, setUserStatusFilter] = useState<"all" | "active" | "blocked">("all");
  const [userVerificationFilter, setUserVerificationFilter] = useState<"all" | "verified" | "unverified">("all");
  const [itemSearch, setItemSearch] = useState("");
  const [itemTypeFilter, setItemTypeFilter] = useState<"all" | "lost" | "found">("all");
  const [itemStatusFilter, setItemStatusFilter] = useState<"all" | AdminItem["status"]>("all");
  const [reportSearch, setReportSearch] = useState("");
  const [reportStatusFilter, setReportStatusFilter] = useState<"all" | AdminReport["status"]>("all");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setError("");
    const supabase = getSupabaseClient();
    try {
      const { data: currentProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id,username,full_name,avatar_url,bio,faculty,course,role,is_verified,is_blocked,created_at")
        .eq("id", user.id)
        .maybeSingle();
      if (profileError) throw new Error(profileError.message);
      setProfile(currentProfile as Profile | null);
      if (currentProfile?.role !== "admin") {
        setLoading(false);
        return;
      }

      const [usersResult, itemsResult, reportsResult, usersCount, itemsCount, reportsCount, returnedCount, activeItemsCount, openReportsCount] = await Promise.all([
        supabase.from("profiles").select("id,username,full_name,avatar_url,bio,faculty,course,role,is_verified,is_blocked,created_at").order("created_at", { ascending: false }),
        supabase.from("items").select("id,title,type,status,created_at,profiles!items_user_profile_fkey(username)").order("created_at", { ascending: false }).limit(100),
        supabase.from("reports").select("id,item_id,reason,status,created_at,items(title)").order("created_at", { ascending: false }).limit(100),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("items").select("id", { count: "exact", head: true }),
        supabase.from("reports").select("id", { count: "exact", head: true }),
        supabase.from("items").select("id", { count: "exact", head: true }).eq("status", "returned"),
        supabase.from("items").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
      ]);
      if (usersResult.error) throw new Error(usersResult.error.message);
      if (itemsResult.error) throw new Error(itemsResult.error.message);
      if (reportsResult.error) throw new Error(reportsResult.error.message);
      if (usersCount.error) throw new Error(usersCount.error.message);
      if (itemsCount.error) throw new Error(itemsCount.error.message);
      if (reportsCount.error) throw new Error(reportsCount.error.message);
      if (returnedCount.error) throw new Error(returnedCount.error.message);
      if (activeItemsCount.error) throw new Error(activeItemsCount.error.message);
      if (openReportsCount.error) throw new Error(openReportsCount.error.message);
      setUsers(usersResult.data as unknown as Profile[]);
      setItems(itemsResult.data as unknown as AdminItem[]);
      setReports(reportsResult.data as unknown as AdminReport[]);
      setMetrics({
        users: usersCount.count ?? 0,
        items: itemsCount.count ?? 0,
        reports: reportsCount.count ?? 0,
        returned: returnedCount.count ?? 0,
        activeItems: activeItemsCount.count ?? 0,
        openReports: openReportsCount.count ?? 0,
      });
      if (section === "overview") {
        const { data: activityStats, error: activityStatsError } = await supabase.rpc(
          "admin_activity_stats",
          { p_period_days: periodDays },
        );
        if (activityStatsError) throw new Error(activityStatsError.message);
        setDailyStats(activityStats as AdminDailyStat[]);
      } else {
        setDailyStats([]);
      }
      if (section === "activity") {
        const { data: auditData, error: auditError } = await supabase
          .from("admin_audit_log")
          .select("id,actor_username,action,target_type,target_id,target_label,status,created_at")
          .order("created_at", { ascending: false })
          .limit(200);
        if (auditError) throw new Error(auditError.message);
        setAuditEntries(auditData as AdminAuditEntry[]);
      } else {
        setAuditEntries([]);
      }
    } catch (loadError) {
      setError(localizedError(language, loadError, "admin.error.load"));
    } finally {
      setLoading(false);
    }
  }, [language, periodDays, section, user]);

  useEffect(() => {
    const task = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(task);
  }, [loadData]);
  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLocaleLowerCase();
    return users.filter((entry) => {
      const matchesSearch = `${entry.username} ${entry.full_name}`.toLocaleLowerCase().includes(query);
      const matchesRole = userRoleFilter === "all" || entry.role === userRoleFilter;
      const matchesStatus = userStatusFilter === "all"
        || (userStatusFilter === "blocked" ? entry.is_blocked : !entry.is_blocked);
      const matchesVerification = userVerificationFilter === "all"
        || (userVerificationFilter === "verified" ? entry.is_verified : !entry.is_verified);
      return matchesSearch && matchesRole && matchesStatus && matchesVerification;
    });
  }, [userRoleFilter, userSearch, userStatusFilter, userVerificationFilter, users]);
  const filteredItems = useMemo(() => {
    const query = itemSearch.trim().toLocaleLowerCase();
    return items.filter((item) => {
      const matchesSearch = `${item.title} ${item.profiles?.username ?? ""}`.toLocaleLowerCase().includes(query);
      const matchesType = itemTypeFilter === "all" || item.type === itemTypeFilter;
      const matchesStatus = itemStatusFilter === "all" || item.status === itemStatusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [itemSearch, itemStatusFilter, itemTypeFilter, items]);
  const filteredReports = useMemo(() => {
    const query = reportSearch.trim().toLocaleLowerCase();
    return reports.filter((report) => {
      const matchesSearch = `${report.reason} ${report.items?.title ?? ""}`.toLocaleLowerCase().includes(query);
      const matchesStatus = reportStatusFilter === "all" || report.status === reportStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [reportSearch, reportStatusFilter, reports]);
  const filteredAuditEntries = useMemo(() => {
    const query = auditSearch.trim().toLocaleLowerCase();
    return auditEntries.filter((entry) => {
      const matchesSearch = `${entry.actor_username} ${entry.target_label} ${entry.action}`
        .toLocaleLowerCase()
        .includes(query);
      const matchesStatus = auditStatusFilter === "all" || entry.status === auditStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [auditEntries, auditSearch, auditStatusFilter]);
  const maxDaily = Math.max(
    1,
    ...dailyStats.flatMap((day) => [day.users_created, day.listings_created, day.reports_created]),
  );
  const runAdminAction = async (
    action: () => PromiseLike<{ error: { message: string } | null }>,
    audit: AdminAuditMeta,
  ) => {
    setError("");
    setWarning("");
    try {
      if (!user || !profile) throw new Error(t("admin.error.session"));
      const result = await action();
      if (result.error) throw new Error(result.error.message);
      const { error: auditError } = await supabase.from("admin_audit_log").insert({
        actor_id: user.id,
        actor_username: profile.username,
        action: audit.action,
        target_type: audit.targetType,
        target_id: audit.targetId,
        target_label: audit.targetLabel,
        status: "succeeded",
      });
      await loadData();
      if (auditError) {
        console.error("Admin action succeeded but audit logging failed.", auditError);
        setWarning(t("admin.error.audit"));
      }
    } catch (actionError) {
      setError(localizedError(language, actionError, "admin.error.action"));
    }
  };
  const supabase = getSupabaseClient();
  const locale = language === "kk" ? "kk-KZ" : language === "en" ? "en-US" : "ru-RU";
  const sections = [
    { id: "overview", href: "/admin", label: t("admin.section.overview") },
    { id: "users", href: "/admin/users", label: t("admin.section.users") },
    { id: "listings", href: "/admin/listings", label: t("admin.section.listings") },
    { id: "reports", href: "/admin/reports", label: t("admin.section.reports") },
    { id: "activity", href: "/admin/activity", label: t("admin.section.activity") },
  ] as const;

  return (
    <main className="foundly-shell container-fluid px-0">
      <SiteHeader />
      <section className="admin-page container">
        <BackLink />
        {!isReady || loading ? <p>{t("admin.loading")}</p> : !user ? (
          <div className="profile-empty"><h1>{t("admin.signInTitle")}</h1><Button href="/login" variant="contained">{t("admin.signIn")}</Button></div>
        ) : profile?.role !== "admin" ? (
          <div className="profile-empty"><h1>{t("admin.noAccess")}</h1><p>{t("admin.onlyAdmins")}</p><Link href="/">{t("admin.home")}</Link></div>
        ) : (
          <>
            <header className="admin-heading"><div><span className="section-kicker">{t("admin.kicker")}</span><h1>{t("admin.title")}</h1></div><span className="admin-badge">{t("admin.role.admin")}</span></header>
            {error && <Alert severity="error">{error}</Alert>}
            {warning && <Alert severity="warning">{warning}</Alert>}
            <div className="admin-workspace">
                <nav aria-label={t("admin.navigation")} className="admin-navigation">
                  {sections.map((navSection) => (
                    <Link
                      aria-current={navSection.id === section ? "page" : undefined}
                      className={navSection.id === section ? "is-active" : undefined}
                      href={navSection.href}
                      key={navSection.id}
                    >
                      {navSection.label}
                    </Link>
                  ))}
                </nav>
                <div className="admin-workspace-content">
                  {section === "overview" && (
                    <>
                      <div className="admin-stats">
                        <Link className="admin-stat-link" href="/admin/users"><span>{t("admin.stats.users")}</span><strong>{metrics.users}</strong></Link>
                        <Link className="admin-stat-link" href="/admin/listings"><span>{t("admin.stats.items")}</span><strong>{metrics.items}</strong></Link>
                        <Link className="admin-stat-link" href="/admin/reports"><span>{t("admin.stats.reports")}</span><strong>{metrics.reports}</strong></Link>
                        <Link className="admin-stat-link" href="/admin/listings"><span>{t("admin.stats.returned")}</span><strong>{metrics.returned}</strong></Link>
                        <Link className="admin-stat-link" href="/admin/listings"><span>{t("admin.stats.activeItems")}</span><strong>{metrics.activeItems}</strong></Link>
                        <Link className="admin-stat-link" href="/admin/reports"><span>{t("admin.stats.openReports")}</span><strong>{metrics.openReports}</strong></Link>
                      </div>
                      <section className="admin-panel">
                        <div className="admin-section-heading">
                          <h2>{t("admin.chart.title")}</h2>
                          <label className="admin-period-filter">
                            <span>{t("admin.stats.period")}</span>
                            <select
                              onChange={(event) => {
                                const value = Number(event.target.value);
                                if (value === 7 || value === 30 || value === 90) setPeriodDays(value);
                              }}
                              value={periodDays}
                            >
                              <option value={7}>{t("admin.stats.period.7days")}</option>
                              <option value={30}>{t("admin.stats.period.30days")}</option>
                              <option value={90}>{t("admin.stats.period.90days")}</option>
                            </select>
                          </label>
                        </div>
                        <div className="admin-chart-legend">
                          <span className="admin-chart-legend-users">{t("admin.stats.users")}</span>
                          <span className="admin-chart-legend-items">{t("admin.stats.items")}</span>
                          <span className="admin-chart-legend-reports">{t("admin.stats.reports")}</span>
                        </div>
                        <div aria-label={t("admin.chart.aria")} className="admin-chart admin-chart-multi" role="img">
                          {dailyStats.map((day) => {
                            const values = [
                              { key: "users", value: day.users_created },
                              { key: "items", value: day.listings_created },
                              { key: "reports", value: day.reports_created },
                            ] as const;
                            return (
                              <div key={day.day}>
                                <div className="admin-chart-bars">
                                  {values.map((entry) => (
                                    <i
                                      className={`admin-chart-bar admin-chart-bar-${entry.key}`}
                                      key={entry.key}
                                      style={{ height: entry.value ? `${Math.max(4, entry.value / maxDaily * 100)}%` : "2px" }}
                                      title={`${t(`admin.stats.${entry.key}`)}: ${entry.value}`}
                                    />
                                  ))}
                                </div>
                                <small>{new Date(`${day.day}T12:00:00Z`).toLocaleDateString(locale, { day: "numeric", month: "short" })}</small>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    </>
                  )}
                  {section === "users" && (
                    <section className="admin-panel">
                      <div className="admin-section-heading"><h2>{t("admin.users")}</h2></div>
                      <div className="admin-filters">
                        <label><span>{t("admin.search.aria")}</span><input onChange={(event) => setUserSearch(event.target.value)} placeholder={t("admin.search.placeholder")} type="search" value={userSearch} /></label>
                        <label><span>{t("admin.filter.role")}</span><select onChange={(event) => setUserRoleFilter(event.target.value as typeof userRoleFilter)} value={userRoleFilter}>
                          <option value="all">{t("admin.filter.allRoles")}</option>
                          <option value="admin">{t("admin.role.admin")}</option>
                          <option value="user">{t("admin.role.user")}</option>
                        </select></label>
                        <label><span>{t("admin.filter.accountStatus")}</span><select onChange={(event) => setUserStatusFilter(event.target.value as typeof userStatusFilter)} value={userStatusFilter}>
                          <option value="all">{t("admin.filter.allStatuses")}</option>
                          <option value="active">{t("admin.user.active")}</option>
                          <option value="blocked">{t("admin.user.blocked")}</option>
                        </select></label>
                        <label><span>{t("admin.filter.verification")}</span><select onChange={(event) => setUserVerificationFilter(event.target.value as typeof userVerificationFilter)} value={userVerificationFilter}>
                          <option value="all">{t("admin.filter.all")}</option>
                          <option value="verified">{t("admin.user.verified")}</option>
                          <option value="unverified">{t("admin.filter.unverified")}</option>
                        </select></label>
                      </div>
                      {filteredUsers.length ? (
                        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{t("admin.table.profile")}</th><th>{t("admin.table.role")}</th><th>{t("admin.table.status")}</th><th>{t("admin.table.actions")}</th></tr></thead><tbody>
                          {filteredUsers.map((entry) => <tr key={entry.id}><td><Link href={`/u/${encodeURIComponent(entry.username)}`}>@{entry.username}</Link><small>{entry.full_name}</small></td><td>{t(entry.role === "admin" ? "admin.role.admin" : "admin.role.user")}</td><td>{entry.is_blocked ? t("admin.user.blocked") : t("admin.user.active")}{entry.is_verified && ` · ${t("admin.user.verified")}`}</td><td className="admin-actions">
                            <Button size="small" onClick={() => void runAdminAction(
                              () => supabase.from("profiles").update({ is_verified: !entry.is_verified }).eq("id", entry.id),
                              { action: entry.is_verified ? "user_unverified" : "user_verified", targetType: "user", targetId: entry.id, targetLabel: entry.username },
                            )}>{entry.is_verified ? t("admin.user.unverify") : t("admin.user.verify")}</Button>
                            <Button disabled={entry.id === user.id} size="small" onClick={() => void runAdminAction(
                              () => supabase.from("profiles").update({ is_blocked: !entry.is_blocked }).eq("id", entry.id),
                              { action: entry.is_blocked ? "user_unblocked" : "user_blocked", targetType: "user", targetId: entry.id, targetLabel: entry.username },
                            )}>{entry.is_blocked ? t("admin.user.unblock") : t("admin.user.block")}</Button>
                            <Button disabled={entry.id === user.id} size="small" onClick={() => void runAdminAction(
                              () => supabase.from("profiles").update({ role: entry.role === "admin" ? "user" : "admin" }).eq("id", entry.id),
                              { action: entry.role === "admin" ? "admin_removed" : "admin_granted", targetType: "user", targetId: entry.id, targetLabel: entry.username },
                            )}>{entry.role === "admin" ? t("admin.user.removeAdmin") : t("admin.user.makeAdmin")}</Button>
                          </td></tr>)}
                        </tbody></table></div>
                      ) : <p className="admin-filter-empty">{t("admin.filter.noResults")}</p>}
                    </section>
                  )}
                  {section === "listings" && (
                    <section className="admin-panel">
                      <div className="admin-section-heading"><h2>{t("admin.listings")}</h2></div>
                      <div className="admin-filters">
                        <label><span>{t("admin.filter.searchListings")}</span><input onChange={(event) => setItemSearch(event.target.value)} placeholder={t("admin.filter.searchListings")} type="search" value={itemSearch} /></label>
                        <label><span>{t("admin.filter.type")}</span><select onChange={(event) => setItemTypeFilter(event.target.value as typeof itemTypeFilter)} value={itemTypeFilter}>
                          <option value="all">{t("admin.filter.allTypes")}</option>
                          <option value="lost">{t("admin.item.type.lost")}</option>
                          <option value="found">{t("admin.item.type.found")}</option>
                        </select></label>
                        <label><span>{t("admin.filter.status")}</span><select onChange={(event) => setItemStatusFilter(event.target.value as typeof itemStatusFilter)} value={itemStatusFilter}>
                          <option value="all">{t("admin.filter.allStatuses")}</option>
                          <option value="active">{t("admin.item.status.active")}</option>
                          <option value="returned">{t("admin.item.status.returned")}</option>
                          <option value="hidden">{t("admin.item.status.hidden")}</option>
                        </select></label>
                      </div>
                      {filteredItems.length ? <div className="admin-list">{filteredItems.map((item) => <article key={item.id}><div><Link href={`/item/${item.id}`}>{item.title}</Link><small>@{item.profiles?.username ?? "—"} · {t(item.type === "lost" ? "admin.item.type.lost" : "admin.item.type.found")} · {t(`admin.item.status.${item.status}`)}</small></div>
                        <Button size="small" onClick={() => void runAdminAction(
                          () => supabase.from("items").update({ status: item.status === "hidden" ? "active" : "hidden" }).eq("id", item.id),
                          { action: item.status === "hidden" ? "listing_shown" : "listing_hidden", targetType: "listing", targetId: item.id, targetLabel: item.title },
                        )}>{item.status === "hidden" ? t("admin.item.show") : t("admin.item.hide")}</Button>
                        <Button color="error" size="small" onClick={() => {
                          if (window.confirm(t("admin.item.deleteConfirm"))) {
                            void runAdminAction(
                              () => supabase.from("items").delete().eq("id", item.id),
                              { action: "listing_deleted", targetType: "listing", targetId: item.id, targetLabel: item.title },
                            );
                          }
                        }}>{t("admin.item.delete")}</Button>
                      </article>)}</div> : <p className="admin-filter-empty">{t("admin.filter.noResults")}</p>}
                    </section>
                  )}
                  {section === "reports" && (
                    <section className="admin-panel">
                      <div className="admin-section-heading"><h2>{t("admin.reports")}</h2></div>
                      <div className="admin-filters">
                        <label><span>{t("admin.filter.searchReports")}</span><input onChange={(event) => setReportSearch(event.target.value)} placeholder={t("admin.filter.searchReports")} type="search" value={reportSearch} /></label>
                        <label><span>{t("admin.filter.status")}</span><select onChange={(event) => setReportStatusFilter(event.target.value as typeof reportStatusFilter)} value={reportStatusFilter}>
                          <option value="all">{t("admin.filter.allStatuses")}</option>
                          <option value="open">{t("admin.report.status.open")}</option>
                          <option value="reviewed">{t("admin.report.status.reviewed")}</option>
                          <option value="dismissed">{t("admin.report.status.dismissed")}</option>
                        </select></label>
                      </div>
                      {!reports.length ? <p>{t("admin.report.empty")}</p> : !filteredReports.length ? (
                        <p className="admin-filter-empty">{t("admin.filter.noResults")}</p>
                      ) : (
                        <div className="admin-list">{filteredReports.map((report) => {
                          const nextStatus: AdminReport["status"] = report.status === "open"
                            ? "reviewed"
                            : report.status === "reviewed" ? "dismissed" : "open";
                          const auditAction = nextStatus === "reviewed"
                            ? "report_reviewed"
                            : nextStatus === "dismissed" ? "report_dismissed" : "report_reopened";
                          const actionLabel = report.status === "open"
                            ? t("admin.report.review")
                            : report.status === "reviewed" ? t("admin.report.dismiss") : t("admin.report.reopen");
                          const listingTitle = report.items?.title ?? t("admin.report.deletedListing");
                          return (
                            <article key={report.id}>
                              <div><strong>{listingTitle}</strong><small>{report.reason} · {t(`admin.report.status.${report.status}`)}</small></div>
                              <Button size="small" onClick={() => void runAdminAction(
                                () => supabase.from("reports").update({ status: nextStatus }).eq("id", report.id),
                                { action: auditAction, targetType: "report", targetId: report.id, targetLabel: listingTitle },
                              )}>{actionLabel}</Button>
                              <Button color="error" size="small" onClick={() => void runAdminAction(
                                () => supabase.from("reports").delete().eq("id", report.id),
                                { action: "report_deleted", targetType: "report", targetId: report.id, targetLabel: listingTitle },
                              )}>{t("admin.report.delete")}</Button>
                            </article>
                          );
                        })}</div>
                      )}
                    </section>
                  )}
                  {section === "activity" && (
                    <section className="admin-panel">
                      <div className="admin-section-heading"><h2>{t("admin.audit.title")}</h2></div>
                      <div className="admin-filters">
                        <label><span>{t("admin.audit.search")}</span><input onChange={(event) => setAuditSearch(event.target.value)} placeholder={t("admin.audit.search")} type="search" value={auditSearch} /></label>
                        <label><span>{t("admin.audit.status")}</span><select onChange={(event) => setAuditStatusFilter(event.target.value as typeof auditStatusFilter)} value={auditStatusFilter}>
                          <option value="all">{t("admin.filter.allStatuses")}</option>
                          <option value="succeeded">{t("admin.audit.status.succeeded")}</option>
                          <option value="failed">{t("admin.audit.status.failed")}</option>
                          <option value="pending">{t("admin.audit.status.pending")}</option>
                        </select></label>
                      </div>
                      {!auditEntries.length ? <p>{t("admin.audit.empty")}</p> : !filteredAuditEntries.length ? (
                        <p className="admin-filter-empty">{t("admin.filter.noResults")}</p>
                      ) : (
                        <div className="admin-list">{filteredAuditEntries.map((entry) => (
                          <article className="admin-audit-entry" key={entry.id}>
                            <div>
                              <strong>{t(auditActionKeys[entry.action] ?? "admin.audit.action.unknown")}</strong>
                              <small>{t(`admin.audit.target.${entry.target_type}`)} · {entry.target_label || entry.target_id || "—"}</small>
                            </div>
                            <div className="admin-audit-meta">
                              <small>{t("admin.audit.actor")}: @{entry.actor_username}</small>
                              <time dateTime={entry.created_at}>{new Date(entry.created_at).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}</time>
                            </div>
                            <span className={`admin-audit-status is-${entry.status}`}>{t(`admin.audit.status.${entry.status}`)}</span>
                          </article>
                        ))}</div>
                      )}
                    </section>
                  )}
                </div>
            </div>
          </>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
