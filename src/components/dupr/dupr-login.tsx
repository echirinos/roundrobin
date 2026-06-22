"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getEncodedClientId, getDuprEndpoints, DUPR_CONFIG } from "@/src/lib/dupr/config";
import type { DuprLoginEvent, DuprPlayer } from "@/src/lib/dupr/types";
import { formatDuprRating, getDuprTier } from "@/src/lib/dupr/service";

interface DuprLoginProps {
  open: boolean;
  onClose: () => void;
  onLoginSuccess: (player: DuprPlayer) => void;
}

export function DuprLogin({ open, onClose, onLoginSuccess }: DuprLoginProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const encodedClientId = getEncodedClientId();
  const endpoints = getDuprEndpoints();
  const loginUrl = `${endpoints.login}/${encodedClientId}`;

  // Handle messages from the DUPR iframe
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      // Verify the origin matches DUPR
      const allowedOrigins = [
        'https://uat.dupr.gg',
        'https://dashboard.dupr.com',
        'https://dupr.gg',
      ];

      if (!allowedOrigins.some((origin) => event.origin.includes(origin.replace('https://', '')))) {
        return;
      }

      const data = event.data as Partial<DuprLoginEvent>;

      // Check if this is a DUPR login event
      if (data.userToken && data.duprId) {
        const loginEvent = data as DuprLoginEvent;

        // Create player from DUPR data
        const player: DuprPlayer = {
          id: Math.random().toString(36).substring(2, 9),
          name: loginEvent.stats?.doublesRating
            ? `${loginEvent.firstName || ''} ${loginEvent.lastName || ''}`.trim() || `DUPR ${loginEvent.duprId}`
            : `DUPR ${loginEvent.duprId}`,
          duprId: loginEvent.duprId,
          duprRating: loginEvent.stats?.doublesRating,
          duprSinglesRating: loginEvent.stats?.singlesRating,
          duprProvisional: loginEvent.stats?.doublesProvisional,
          duprVerified: true,
          rating: loginEvent.stats?.doublesRating,
        };

        onLoginSuccess(player);
        onClose();
      }
    },
    [onLoginSuccess, onClose]
  );

  useEffect(() => {
    if (open) {
      window.addEventListener('message', handleMessage);
      return () => {
        window.removeEventListener('message', handleMessage);
      };
    }
  }, [open, handleMessage]);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setError('Failed to load DUPR login. Please try again.');
  };

  if (!encodedClientId) {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>DUPR Login</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center">
            <p className="text-muted-foreground">
              DUPR integration is not configured. Please set up your DUPR API credentials.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Login with DUPR
            <Badge variant="outline" className="text-xs">
              {DUPR_CONFIG.environment.toUpperCase()}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Sign in with your DUPR account to import your rating
          </DialogDescription>
        </DialogHeader>

        <div className="relative min-h-[400px] bg-muted/30 rounded-lg overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading DUPR...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
              <div className="text-center p-4">
                <p className="text-destructive mb-4">{error}</p>
                <Button onClick={() => window.location.reload()}>Retry</Button>
              </div>
            </div>
          )}

          <iframe
            src={loginUrl}
            className="w-full h-[400px] border-0"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            title="DUPR Login"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>

        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// DUPR Rating Display Badge
interface DuprRatingBadgeProps {
  rating?: number;
  provisional?: boolean;
  showTier?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function DuprRatingBadge({
  rating,
  provisional,
  showTier = false,
  size = 'md',
}: DuprRatingBadgeProps) {
  if (!rating) return null;

  const formattedRating = formatDuprRating(rating, provisional);
  const tier = getDuprTier(rating);

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <Badge
      variant="secondary"
      className={`${sizeClasses[size]} font-mono bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300`}
    >
      DUPR {formattedRating}
      {showTier && <span className="ml-1 opacity-70">({tier})</span>}
    </Badge>
  );
}

// DUPR Player Card
interface DuprPlayerCardProps {
  player: DuprPlayer;
  onRemove?: () => void;
  compact?: boolean;
}

export function DuprPlayerCard({ player, onRemove, compact = false }: DuprPlayerCardProps) {
  return (
    <div
      className={`flex items-center gap-3 ${
        compact ? 'p-2' : 'p-3'
      } rounded-lg border bg-card`}
    >
      {/* Avatar or DUPR image */}
      {player.duprImageUrl ? (
        <img
          src={player.duprImageUrl}
          alt={player.name}
          className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} rounded-full object-cover`}
        />
      ) : (
        <div
          className={`${
            compact ? 'w-8 h-8 text-sm' : 'w-10 h-10'
          } rounded-full bg-primary flex items-center justify-center text-white font-bold`}
        >
          {player.name.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-medium truncate ${compact ? 'text-sm' : ''}`}>
            {player.name}
          </span>
          {player.duprVerified && (
            <Badge variant="outline" className="text-xs py-0 text-green-600">
              Verified
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {player.duprId && <span>#{player.duprId}</span>}
          {player.duprRating && (
            <DuprRatingBadge
              rating={player.duprRating}
              provisional={player.duprProvisional}
              size="sm"
            />
          )}
        </div>
      </div>

      {/* Remove button */}
      {onRemove && (
        <button
          onClick={onRemove}
          className="text-lg text-muted-foreground hover:text-destructive"
        >
          ×
        </button>
      )}
    </div>
  );
}
