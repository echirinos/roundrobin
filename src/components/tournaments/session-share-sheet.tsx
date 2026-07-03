"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  QrCode,
  Radio,
  RefreshCw,
  Share2,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ShineBorder } from "@/components/ui/shine-border";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import type { SessionStats } from "@/src/lib/live-session";

export type LiveSyncStatus = "local" | "publishing" | "syncing" | "live" | "error";

interface SessionShareSheetProps {
  code: string | null;
  shareUrl: string;
  isReadOnly: boolean;
  stats: SessionStats;
  syncStatus: LiveSyncStatus;
  syncError: string | null;
  lastSyncedAt: string | null;
  onPublish: () => Promise<void> | void;
  onRefresh?: () => Promise<void> | void;
}

function formatSyncTime(value: string | null): string {
  if (!value) return "Not synced yet";

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function SessionQrCode({ value }: { value: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!value || !canvasRef.current) return;

    let isMounted = true;

    import("qrcode")
      .then(({ toCanvas }) => {
        if (!canvasRef.current || !isMounted) return;

        toCanvas(
          canvasRef.current,
          value,
          {
            width: 192,
            margin: 2,
            errorCorrectionLevel: "M",
            color: {
              dark: "#0a0a0a",
              light: "#ffffff",
            },
          },
          (error) => {
            if (isMounted) {
              setHasError(Boolean(error));
            }
          }
        );
      })
      .catch(() => {
        if (isMounted) {
          setHasError(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [value]);

  if (!value || hasError) {
    return (
      <div className="flex aspect-square w-48 items-center justify-center rounded-lg border bg-muted text-sm text-muted-foreground">
        QR unavailable
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/70 bg-white p-3 shadow-sm">
      <canvas ref={canvasRef} aria-label="Live session QR code" />
    </div>
  );
}

export function SessionShareSheet({
  code,
  shareUrl,
  isReadOnly,
  stats,
  syncStatus,
  syncError,
  lastSyncedAt,
  onPublish,
  onRefresh,
}: SessionShareSheetProps) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const isBusy = syncStatus === "publishing" || syncStatus === "syncing";
  const canUseNativeShare =
    typeof navigator !== "undefined" &&
    "share" in navigator &&
    Boolean(shareUrl);

  const statusCopy = useMemo(() => {
    if (isReadOnly) return "Spectating";
    if (syncStatus === "live") return "Live";
    if (syncStatus === "publishing") return "Publishing";
    if (syncStatus === "syncing") return "Syncing";
    if (syncStatus === "error") return "Needs attention";
    return "Local only";
  }, [isReadOnly, syncStatus]);

  const copyValue = async (kind: "code" | "link", value: string) => {
    if (!value) return;

    await navigator.clipboard.writeText(value);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1600);
  };

  const handleNativeShare = async () => {
    if (!canUseNativeShare || !shareUrl) return;

    await navigator.share({
      title: "Pickleball live session",
      text: code
        ? `Join the live pickleball session with code ${code}.`
        : "Join the live pickleball session.",
      url: shareUrl,
    });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant={code ? "outline" : "default"}
          size="sm"
          className="min-h-11 shrink-0 sm:min-h-8"
          data-analytics-event="live_session_sheet_opened"
          data-analytics-location="tournament_header"
          data-analytics-state={code ? "published" : "local"}
        >
          <Share2 data-icon="inline-start" />
          {isReadOnly ? "Session" : code ? "Share" : "Go live"}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="max-h-[92vh] overflow-y-auto rounded-t-lg sm:left-auto sm:right-0 sm:top-0 sm:h-full sm:max-h-none sm:w-[420px] sm:rounded-none sm:border-l"
      >
        <SheetHeader>
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="flex flex-col gap-1">
              <SheetTitle>Live session</SheetTitle>
              <SheetDescription>
                Share the scoreboard, schedule, and current round status.
              </SheetDescription>
            </div>
            <Badge variant={syncStatus === "error" ? "destructive" : "secondary"}>
              {statusCopy}
            </Badge>
          </div>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          {syncError && (
            <Alert variant="destructive">
              <AlertTriangle />
              <AlertTitle>Session sync failed</AlertTitle>
              <AlertDescription>{syncError}</AlertDescription>
            </Alert>
          )}

          <Card className="court-line-surface overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Radio className="size-4" />
                Session status
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{stats.statusLabel}</span>
                <span className="font-data font-semibold">
                  {stats.completedGames}/{stats.totalGames || 0} games
                </span>
              </div>
              <Progress value={stats.completionPercent} />
              <p className="text-xs text-muted-foreground">
                Last synced: {formatSyncTime(lastSyncedAt)}
              </p>
            </CardContent>
          </Card>

          {!code && !isReadOnly ? (
            <Alert>
              <QrCode />
              <AlertTitle>Publish a live session</AlertTitle>
              <AlertDescription>
                Create a short code and QR link for spectators to follow from
                their phones.
              </AlertDescription>
            </Alert>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Join code</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <div
                    className="font-display flex h-14 items-center justify-center rounded-lg border border-primary/45 bg-background/75 text-center text-3xl font-semibold tracking-[0.35em] shadow-inner"
                    aria-label="Live session join code"
                  >
                    {code}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => copyValue("code", code ?? "")}
                    disabled={!code}
                    data-analytics-event="share_code_copied"
                    data-analytics-location="live_session_sheet"
                  >
                    {copied === "code" ? (
                      <Check data-icon="inline-start" />
                    ) : (
                      <Copy data-icon="inline-start" />
                    )}
                    Copy code
                  </Button>
                </div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 280, damping: 24 }}
                  className="relative mx-auto rounded-lg p-1"
                >
                  <ShineBorder
                    borderWidth={1}
                    duration={13}
                    shineColor={["var(--live)", "var(--primary)"]}
                  />
                  <SessionQrCode value={shareUrl} />
                </motion.div>

                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    onClick={() => copyValue("link", shareUrl)}
                    disabled={!shareUrl}
                    data-analytics-event="share_link_copied"
                    data-analytics-location="live_session_sheet"
                  >
                    {copied === "link" ? (
                      <Check data-icon="inline-start" />
                    ) : (
                      <Copy data-icon="inline-start" />
                    )}
                    Copy spectator link
                  </Button>
                  {canUseNativeShare && (
                    <Button
                      variant="outline"
                      onClick={handleNativeShare}
                      data-analytics-event="native_share_clicked"
                      data-analytics-location="live_session_sheet"
                    >
                      <ExternalLink data-icon="inline-start" />
                      Share with phone
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col gap-2">
            {isReadOnly ? (
              <Button onClick={onRefresh} disabled={!onRefresh || isBusy}>
                <RefreshCw
                  data-icon="inline-start"
                  className={isBusy ? "size-4 animate-spin" : "size-4"}
                />
                Refresh now
              </Button>
            ) : (
              <ShimmerButton
                type="button"
                onClick={onPublish}
                disabled={isBusy}
                data-analytics-event={
                  code ? "live_session_sync_clicked" : "live_session_publish_clicked"
                }
                data-analytics-location="live_session_sheet"
                borderRadius="0.5rem"
                background="linear-gradient(135deg, var(--primary), var(--accent))"
                shimmerColor="var(--live)"
                className="h-11 w-full gap-2 px-5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  data-icon="inline-start"
                  className={isBusy ? "size-4 animate-spin" : "size-4"}
                />
                {code ? "Sync now" : "Publish session"}
              </ShimmerButton>
            )}
            <p className="text-center text-xs text-muted-foreground">
              Spectators get a read-only view that updates while this server is
              running.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
