import { Bookmark, Flag, Share2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, jsonBody } from "@/lib/api";
import type { EntityKind } from "@/lib/types";
import { Button, useToast } from "@/components/ui/Ui";

export function EntityActions({ kind, id, saved = false, invalidate }: { kind: EntityKind; id: number; saved?: boolean; invalidate?: string[] }) {
  const query = useQueryClient();
  const { notify } = useToast();
  const status = useQuery({ queryKey: ["saved", kind, id], queryFn: () => apiRequest<{ saved: boolean }>(`/saved-items/${kind}/${id}`), initialData: { success: true, data: { saved } }, staleTime: 60_000 });
  const effectiveSaved = status.data.data.saved;
  const save = useMutation({
    mutationFn: () => apiRequest(`/saved-items/${kind}/${id}`, { method: effectiveSaved ? "DELETE" : "POST" }),
    onSuccess: () => {
      notify(effectiveSaved ? "Removed from saved." : "Saved.");
      void query.invalidateQueries({ queryKey: ["saved", kind, id] });
      if (invalidate) void query.invalidateQueries({ queryKey: invalidate });
    }
  });
  const report = useMutation({ mutationFn: () => apiRequest("/reports", { method: "POST", ...jsonBody({ entityKind: kind, entityId: id, reason: "community_guidelines" }) }), onSuccess: () => notify("Report submitted for review.") });
  return <>
    <Button variant="ghost" onClick={() => save.mutate()} disabled={save.isPending}><Bookmark size={17} fill={effectiveSaved ? "currentColor" : "none"} />{effectiveSaved ? "Saved" : "Save"}</Button>
    <Button variant="ghost" onClick={() => { const url = `${location.origin}/${kind === "post" ? "posts" : kind}/${id}`; void navigator.clipboard.writeText(url).then(() => notify("Link copied.")); }}><Share2 size={17} />Share</Button>
    <Button variant="ghost" onClick={() => report.mutate()} disabled={report.isPending}><Flag size={17} />Report</Button>
  </>;
}
