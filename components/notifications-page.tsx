"use client";

import Alert from "@mui/material/Alert";
import Link from "next/link";
import BackLink from "@/components/back-link";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
import { useLanguage } from "@/components/language-provider";
import { useDemoAuth } from "@/lib/use-demo-auth";
import { useItemNotifications } from "@/lib/use-item-notifications";

export default function NotificationsPage() {
  const { language, t } = useLanguage();
  const { user, isReady } = useDemoAuth();
  const {
    notifications,
    subscriptions,
    unreadCount,
    permission,
    isConnected,
    error,
    markRead,
    markAllRead,
    unsubscribeFromItem,
    enableBrowserNotifications,
  } = useItemNotifications();
  const locale = language === "kk" ? "kk-KZ" : language === "en" ? "en-US" : "ru-RU";

  return (
    <main className="foundly-shell container-fluid px-0">
      <SiteHeader active="notifications" />
      <section className="notifications-page container">
        <BackLink />
        <header className="notifications-page-heading">
          <h1>{t("nav.notifications")}</h1>
          {user && unreadCount > 0 && (
            <button className="notification-mark-all" onClick={markAllRead} type="button">
              {t("notifications.markAllRead")}
            </button>
          )}
        </header>

        <div className="notifications-page-card">
          {!isReady ? (
            <div className="notification-popover-empty">
              <p>{t("route.loading.notifications")}</p>
            </div>
          ) : !user ? (
            <div className="notification-popover-empty">
              <p>{t("notifications.loginPrompt")}</p>
              <Link href="/login">{t("nav.login")}</Link>
            </div>
          ) : (
            <>
              {error && <Alert severity="error">{error}</Alert>}
              <div className="notification-popover-body">
                {notifications.length ? (
                  <div className="notification-popover-list">
                    {notifications.map((notification) => {
                      const itemId = notification.kind === "match"
                        ? notification.foundItemId
                        : notification.itemId;
                      const href = `/item/${encodeURIComponent(itemId)}${
                        notification.kind === "sighting"
                          ? `?sighting=${encodeURIComponent(notification.sightingId)}#item-sightings`
                          : ""
                      }`;

                      return (
                        <article
                          className={`notification-popover-item${notification.read ? "" : " is-unread"}`}
                          key={notification.id}
                        >
                          <span aria-hidden="true" className="notification-popover-item-icon">✦</span>
                          <div>
                            {notification.kind === "ownership_claim" ? (
                              <>
                                <span className="match-label">
                                  {notification.read
                                    ? t("notifications.ownershipClaim")
                                    : t("notifications.newOwnershipClaim")}
                                </span>
                                <h3>{notification.itemTitle}</h3>
                                <p>{notification.message}</p>
                              </>
                            ) : notification.kind === "sighting" ? (
                              <>
                                <span className="match-label">
                                  {notification.read
                                    ? t("notifications.sighting")
                                    : t("notifications.newSighting")}
                                </span>
                                <h3>{notification.itemTitle}</h3>
                                <p>
                                  {notification.comment ||
                                    `${notification.observedAt} · ${notification.latitude.toFixed(5)}, ${notification.longitude.toFixed(5)}`}
                                </p>
                              </>
                            ) : (
                              <>
                                <span className="match-label">
                                  {notification.read
                                    ? t("notifications.match")
                                    : t("notifications.newMatch")}
                                </span>
                                <h3>{t("notifications.foundPrefix")} {notification.foundTitle}</h3>
                                <p>{notification.lostTitle} · {notification.foundPlace}</p>
                              </>
                            )}
                            <time dateTime={notification.createdAt}>
                              {new Intl.DateTimeFormat(locale, {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              }).format(new Date(notification.createdAt))}
                            </time>
                            <Link href={href} onClick={() => markRead(notification.id)}>
                              {notification.kind === "ownership_claim"
                                ? t("notifications.reviewOwnershipClaim")
                                : notification.kind === "sighting"
                                  ? t("notifications.openSighting")
                                  : t("notifications.openFound")}
                            </Link>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="notification-popover-empty">
                    <svg aria-hidden="true" className="notification-empty-art" fill="none" viewBox="0 0 220 190">
                      <path d="M42 135h136v27H42z" fill="#F9DC38" />
                      <path d="M42 135h34v27H42z" fill="#C9C56D" />
                      <path d="M42 135l18-18h100l18 18H42Z" fill="#00383B" />
                      <path d="M42 117a68 68 0 0 1 136 0H42Z" fill="#F9DC38" />
                      <path d="M42 117a68 68 0 0 1 34-58v58H42Z" fill="#C9C56D" />
                      <path d="m75 22 17-4 3 6-14 3 7 34-8 2-5-41Z" fill="#00383B" />
                      <circle cx="86" cy="58" r="10" fill="#00383B" />
                      <path d="m146 19 29 7-9 37-8-2 7-30-13-3-5 24-8-2 7-31Z" fill="#00383B" />
                      <circle cx="160" cy="63" r="9" fill="#00383B" />
                      <circle cx="111" cy="26" r="10" fill="#F9DC38" />
                    </svg>
                    <h3>{t("notifications.emptyTitle")}</h3>
                    <p>{t("notifications.emptyDescription")}</p>
                  </div>
                )}

                {subscriptions.length > 0 && (
                  <details className="notification-subscriptions">
                    <summary>{t("notifications.subscriptions")} ({subscriptions.length})</summary>
                    <div>
                      {subscriptions.map((subscription) => (
                        <article key={subscription.itemId}>
                          <Link href={`/item/${encodeURIComponent(subscription.itemId)}`}>
                            {subscription.title}
                          </Link>
                          <button onClick={() => unsubscribeFromItem(subscription.itemId)} type="button">
                            {t("notifications.unsubscribe")}
                          </button>
                        </article>
                      ))}
                    </div>
                  </details>
                )}
              </div>
              <footer className="notification-popover-footer">
                <span className={`notification-connection ${isConnected ? "is-connected" : ""}`}>
                  <span aria-hidden="true" />
                  {isConnected ? t("notifications.online") : t("notifications.connecting")}
                </span>
                {permission === "default" && (
                  <button onClick={() => void enableBrowserNotifications()} type="button">
                    {t("notifications.enableBrowser")}
                  </button>
                )}
                {permission === "granted" && <span>{t("notifications.browserEnabled")}</span>}
                {permission === "denied" && <span>{t("notifications.browserDenied")}</span>}
                {permission === "unsupported" && <span>{t("notifications.browserUnsupported")}</span>}
              </footer>
            </>
          )}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
