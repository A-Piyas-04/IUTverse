"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { markMessagesDelivered } from "./chatApi";

/**
 * Delivery receipts. While the member has IUTverse open, anywhere in the app,
 * messages sent to them count as delivered: the sender's single tick becomes
 * two. Runs on load, when the tab comes back into view, and for each new
 * message Realtime reports (row-level security limits that to their own chats).
 */
export function useInboxReceipts(userId: string | undefined) {
  const cache = useQueryClient();
  useEffect(() => {
    if (!userId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const acknowledge = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (document.visibilityState === "hidden") return;
        void markMessagesDelivered().catch(() => {});
      }, 300);
    };
    const visible = () => {
      if (document.visibilityState === "visible") acknowledge();
    };
    acknowledge();
    document.addEventListener("visibilitychange", visible);
    const channel = supabase
      .channel(`inbox:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (change) => {
        if ((change.new as { sender_id?: string }).sender_id === userId) return;
        acknowledge();
        void cache.invalidateQueries({ queryKey: ["conversations"] });
      })
      .subscribe();
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", visible);
      void supabase.removeChannel(channel);
    };
  }, [cache, userId]);
}
