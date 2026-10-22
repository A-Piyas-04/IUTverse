"use client";

import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { apiPage, apiRequest, jsonBody } from "@/lib/api";
import type { ReportItem } from "@/lib/types";
import { Button, Card, Chip, Dialog, DialogActions, EmptyState } from "@/components/ui/Ui";
import { PageFrame } from "@/components/shell/AppShell";
import styles from "./Pages.module.css";

type Decision = "approve" | "archive" | "dismiss";

// Decisions are final: the server rejects a second decision on a closed report.
const decisionCopy: Record<Decision, { title: string; body: string; confirm: string }> = {
  approve: { title: "Restore this content?", body: "The reported content becomes visible again and the report is closed.", confirm: "Restore" },
  archive: { title: "Archive this content?", body: "The reported content is hidden from members and the report is closed.", confirm: "Archive" },
  dismiss: { title: "Dismiss this report?", body: "The content is left as it is and the report is closed.", confirm: "Dismiss" },
};

export function ModerationPage(){
  const[filter,setFilter]=useState("pending");
  const[pending,setPending]=useState<{report:ReportItem;decision:Decision}|null>(null);
  const cache=useQueryClient();
  const reports=useQuery({queryKey:["reports",filter],queryFn:({signal})=>apiPage<ReportItem>(`/reports?status=${filter}`,signal)});
  const update=useMutation({mutationFn:({id,decision}:{id:number;decision:Decision})=>apiRequest(`/reports/${id}`,{method:"PATCH",...jsonBody({decision})}),onSuccess:()=>{setPending(null);void cache.invalidateQueries({queryKey:["reports"]})}});
  const close=useCallback(()=>{if(!update.isPending)setPending(null)},[update.isPending]);
  const copy=pending?decisionCopy[pending.decision]:null;
  return <PageFrame title="Content Moderation" eyebrow="Admin and moderator access" tabs={<div role="group" aria-label="Report status" style={{display:"flex",gap:8}}>{["pending","reviewed","dismissed"].map(x=><Chip key={x} active={filter===x} onClick={()=>setFilter(x)}>{x}</Chip>)}</div>}>
    <div className={styles.stack}>
      <div className={styles.notice}><ShieldCheck/>Moderation actions are recorded and authorization is enforced by the server.</div>
      {reports.isError&&<EmptyState title="Moderation queue unavailable" body={reports.error.message}/>}
      {reports.data?.data.length===0&&<EmptyState title="No pending reports" body="All reported content in this view has been reviewed."/>}
      {reports.data?.data.map(report=><Card padded key={report.id}><div className={styles.moderationRow}><div><span className={styles.badge}>{report.entityKind}</span><h2>Report #{report.id}</h2><p>{report.reason}</p>{report.details&&<p className={styles.meta}>{report.details}</p>}</div>{filter==="pending"&&<div className={styles.actions} role="group" aria-label={`Decide report ${report.id}`}><Button onClick={()=>setPending({report,decision:"approve"})}><CheckCircle2 size={17}/>Restore</Button><Button variant="danger" onClick={()=>setPending({report,decision:"archive"})}><Archive size={17}/>Archive</Button><Button variant="secondary" onClick={()=>setPending({report,decision:"dismiss"})}><XCircle size={17}/>Dismiss</Button></div>}</div></Card>)}
    </div>
    <Dialog title={copy?.title||""} open={Boolean(pending)} onClose={close}>
      {pending&&copy&&<><p>Report #{pending.report.id} ({pending.report.entityKind}): {pending.report.reason}</p><p className={styles.meta}>{copy.body} This cannot be undone.</p>{update.isError&&<p role="alert">{update.error.message}</p>}<DialogActions><Button variant="secondary" onClick={close} disabled={update.isPending}>Cancel</Button><Button variant={pending.decision==="archive"?"danger":"primary"} onClick={()=>update.mutate({id:pending.report.id,decision:pending.decision})} disabled={update.isPending}>{update.isPending?"Saving…":copy.confirm}</Button></DialogActions></>}
    </Dialog>
  </PageFrame>
}
