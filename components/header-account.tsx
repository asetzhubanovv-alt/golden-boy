"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/language-provider";
import { useDemoAuth } from "@/lib/use-demo-auth";
import { useItemNotifications } from "@/lib/use-item-notifications";
import { getUnreadChatCount, subscribeToConversations } from "@/lib/chat";
import { localizedError } from "@/lib/messages";

type HeaderAccountProps = {
  onUnreadCountsChange: (counts: { chat: number; notifications: number }) => void;
};

export default function HeaderAccount({
  onUnreadCountsChange,
}: HeaderAccountProps) {
  const { language, t } = useLanguage();
  const { user, isReady, error: sessionError } = useDemoAuth();
  const { unreadCount } = useItemNotifications();
  const [chatStatus, setChatStatus] = useState<{
    userId: string;
    count: number;
    error: string;
  } | null>(null);
  useEffect(() => {
    if (!isReady || !user) return;

    let active = true;
    const refreshUnreadCount = async () => {
      try {
        const count = await getUnreadChatCount();
        if (active) {
          setChatStatus({ userId: user.id, count, error: "" });
        }
      } catch (loadError) {
        if (active) {
          setChatStatus({
            userId: user.id,
            count: 0,
            error: loadError instanceof Error
              ? loadError.message
              : "Не удалось загрузить непрочитанные сообщения.",
          });
        }
      }
    };

    void refreshUnreadCount();
    const unsubscribe = subscribeToConversations(
      user.id,
      () => void refreshUnreadCount(),
      (error) => {
        if (active) setChatStatus({ userId: user.id, count: 0, error });
      },
      () => void refreshUnreadCount(),
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [isReady, user]);

  const unreadChatCount =
    chatStatus && chatStatus.userId === user?.id ? chatStatus.count : 0;
  const chatError =
    chatStatus && chatStatus.userId === user?.id ? chatStatus.error : "";

  useEffect(() => {
    onUnreadCountsChange({ chat: unreadChatCount, notifications: unreadCount });
  }, [onUnreadCountsChange, unreadChatCount, unreadCount]);

  return (
    <div className="header-account">
        {!isReady ? (
          <Link className="header-profile-link" href="/login">
            <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="7.5" r="3.5" />
              <path d="M4.5 21c.4-4.1 3.4-6.5 7.5-6.5s7.1 2.4 7.5 6.5" />
            </svg>
            <span>{t("nav.login")}</span>
          </Link>
        ) : user ? (
          <>
          <Link
            aria-label={`${t("nav.chat")}${unreadChatCount ? `: ${unreadChatCount}` : ""}`}
            className="header-messages-link"
            href="/messages"
            title={t("nav.messages")}
          >
            <span className="header-messages-icon">
              <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l1.7-3.1A7.5 7.5 0 1 1 20 11.5Z" />
                <path d="M8.5 11.5h7M8.5 14.5h4" />
              </svg>
              {unreadChatCount > 0 && (
                <span aria-hidden="true" className="notification-count-badge">
                  {unreadChatCount > 99 ? "99+" : unreadChatCount}
                </span>
              )}
            </span>
            <span>{t("nav.chat")}</span>
          </Link>
          <Link
            aria-label={t("nav.favorites")}
            className="header-favorites-link"
            href="/favorites"
            title={t("nav.favorites")}
          >
            <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
              <path d="M20.8 8.7c0 5.2-8.8 11-8.8 11s-8.8-5.8-8.8-11a4.7 4.7 0 0 1 8.8-2.3 4.7 4.7 0 0 1 8.8 2.3Z" />
            </svg>
          </Link>
          <Link
            aria-label={`${t("nav.notifications")}${unreadCount ? `: ${unreadCount}` : ""}`}
            className="header-notifications-link"
            href="/notifications"
            title={t("nav.notifications")}
          >
            <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
              <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" />
            </svg>
            {unreadCount > 0 && (
              <span aria-hidden="true" className="notification-count-badge">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>
          <Link
            aria-label={t("nav.profile")}
            className="header-profile-link"
            href="/profile"
            title={t("nav.profile")}
          >
            <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="7.5" r="3.5" />
              <path d="M4.5 21c.4-4.1 3.4-6.5 7.5-6.5s7.1 2.4 7.5 6.5" />
            </svg>
            <span>{t("nav.profile")}</span>
          </Link>
          </>
        ) : (
          <>
          <Link
            aria-label={`${t("nav.notifications")}${unreadCount ? `: ${unreadCount}` : ""}`}
            className="header-notifications-link"
            href="/notifications"
            title={t("nav.notifications")}
          >
            <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
              <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" />
            </svg>
            {unreadCount > 0 && (
              <span aria-hidden="true" className="notification-count-badge">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>
          <Link
            aria-label={t("nav.favorites")}
            className="header-favorites-link"
            href="/favorites"
            title={t("nav.favorites")}
          >
            <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
              <path d="M20.8 8.7c0 5.2-8.8 11-8.8 11s-8.8-5.8-8.8-11a4.7 4.7 0 0 1 8.8-2.3 4.7 4.7 0 0 1 8.8 2.3Z" />
            </svg>
          </Link>
          <Link className="header-profile-link" href="/login">
            <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="7.5" r="3.5" />
              <path d="M4.5 21c.4-4.1 3.4-6.5 7.5-6.5s7.1 2.4 7.5 6.5" />
            </svg>
            <span>{t("nav.login")}</span>
          </Link>
          </>
        )}
        {(sessionError || chatError) && (
          <span className="header-auth-error" role="status">
            {localizedError(
              language,
              sessionError || chatError,
              sessionError ? "auth.error.session" : "chat.error.unread",
            )}
          </span>
        )}
    </div>
  );
}
