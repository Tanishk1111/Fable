"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useListenStore } from "@/store/useListenStore";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import {
  loadYouTubeAPI,
  getSyncedPosition,
  sessionFingerprint,
  pushPlaybackState,
  fetchSession,
  youtubeThumb,
  formatJamLabel,
  isPlayerPlaying,
  type ListenSession,
  type YTPlayer,
} from "@/lib/listen-sync";

const ECHO_MS = 1400;
const DRIFT_THRESHOLD = 2;
const DRIFT_INTERVAL = 20000;

export default function JamRoom() {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const loadedVideoRef = useRef("");
  const appliedFpRef = useRef("");
  const suppressEchoUntil = useRef(0);
  const syncingRef = useRef(false);
  const verifyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const session = useListenStore((s) => s.session);
  const expanded = useListenStore((s) => s.expanded);
  const playerReady = useListenStore((s) => s.playerReady);
  const setSession = useListenStore((s) => s.setSession);
  const setJamEnabled = useListenStore((s) => s.setJamEnabled);
  const setPlayerReady = useListenStore((s) => s.setPlayerReady);
  const toggleExpanded = useListenStore((s) => s.toggleExpanded);
  const setExpanded = useListenStore((s) => s.setExpanded);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [audioBlocked, setAudioBlocked] = useState(false);

  const scheduleVerify = useCallback((s: ListenSession, fromGesture: boolean) => {
    if (verifyTimerRef.current) clearTimeout(verifyTimerRef.current);
    if (s.is_paused || fromGesture) {
      setAudioBlocked(false);
      return;
    }

    verifyTimerRef.current = setTimeout(() => {
      const player = playerRef.current;
      if (!player?.getPlayerState) return;

      const state = player.getPlayerState();
      const playing = isPlayerPlaying(state);
      const muted = player.isMuted?.() ?? false;

      if (!playing) {
        player.mute?.();
        player.playVideo?.();
        setAudioBlocked(true);
      } else if (muted) {
        setAudioBlocked(true);
      } else {
        setAudioBlocked(false);
      }
    }, 700);
  }, []);

  const startPlayback = useCallback(
    (player: YTPlayer, s: ListenSession, fromGesture: boolean) => {
      if (s.is_paused) {
        player.pauseVideo();
        setAudioBlocked(false);
        return;
      }

      player.setVolume?.(100);

      if (fromGesture) {
        player.unMute?.();
        player.playVideo();
        setAudioBlocked(false);
        return;
      }

      player.unMute?.();
      player.playVideo();
      scheduleVerify(s, false);
    },
    [scheduleVerify]
  );

  const syncPlayerToSession = useCallback(
    (s: ListenSession, fromGesture?: boolean) => {
      const withGesture = fromGesture ?? useListenStore.getState().consumeUserGesture();
      const player = playerRef.current;
      const fp = sessionFingerprint(s);

      setSession(s);

      if (!player?.getPlayerState) {
        appliedFpRef.current = fp;
        return;
      }

      if (fp === appliedFpRef.current || syncingRef.current) return;

      syncingRef.current = true;
      suppressEchoUntil.current = Date.now() + ECHO_MS;
      appliedFpRef.current = fp;

      const pos = getSyncedPosition(s);
      const state = player.getPlayerState();
      const playing = isPlayerPlaying(state);

      try {
        if (loadedVideoRef.current !== s.video_id) {
          loadedVideoRef.current = s.video_id;
          player.loadVideoById(s.video_id, pos);
          window.setTimeout(() => startPlayback(player, s, withGesture), 350);
          return;
        }

        const drift = Math.abs(player.getCurrentTime() - pos);
        if (drift > DRIFT_THRESHOLD) {
          player.seekTo(pos, true);
        }

        if (s.is_paused && playing) {
          player.pauseVideo();
          setAudioBlocked(false);
        } else if (!s.is_paused && !playing) {
          startPlayback(player, s, withGesture);
        } else if (!s.is_paused && playing && withGesture) {
          player.unMute?.();
          setAudioBlocked(false);
        }
      } finally {
        window.setTimeout(() => {
          syncingRef.current = false;
        }, 300);
      }
    },
    [setSession, startPlayback]
  );

  const unlockAudio = useCallback(() => {
    const player = playerRef.current;
    const s = useListenStore.getState().session;
    if (!player || !s) return;

    suppressEchoUntil.current = Date.now() + ECHO_MS;
    player.unMute?.();
    player.setVolume?.(100);

    const pos = getSyncedPosition(s);
    if (loadedVideoRef.current !== s.video_id) {
      loadedVideoRef.current = s.video_id;
      player.loadVideoById(s.video_id, pos);
      window.setTimeout(() => {
        if (!s.is_paused) player.playVideo();
        setAudioBlocked(false);
      }, 300);
      return;
    }

    if (Math.abs(player.getCurrentTime() - pos) > 1) {
      player.seekTo(pos, true);
    }

    if (!s.is_paused) player.playVideo();
    setAudioBlocked(false);
  }, []);

  useEffect(() => {
    let dead = false;

    loadYouTubeAPI().then(async () => {
      if (dead || !containerRef.current || !window.YT?.Player) return;

      setJamEnabled(true);
      const initial = await fetchSession();

      playerRef.current = new window.YT.Player(containerRef.current, {
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          controls: 1,
          fs: 0,
          enablejsapi: 1,
        },
        events: {
          onReady: () => {
            if (dead) return;
            playerRef.current?.setVolume?.(100);
            setPlayerReady(true);
            if (initial) syncPlayerToSession(initial);
          },
          onStateChange: (event) => {
            if (Date.now() < suppressEchoUntil.current || syncingRef.current) return;

            const YT = window.YT?.PlayerState;
            if (!YT) return;

            const current = useListenStore.getState().session;
            if (!current) return;

            const paused = event.data === YT.PAUSED;
            const playing = event.data === YT.PLAYING;
            if (!paused && !playing) return;
            if (paused === current.is_paused) return;

            const pos = event.target.getCurrentTime?.() ?? getSyncedPosition(current);
            suppressEchoUntil.current = Date.now() + ECHO_MS;

            pushPlaybackState(paused, pos).then((updated) => {
              if (updated) {
                appliedFpRef.current = sessionFingerprint(updated);
                setSession(updated);
              }
            });
          },
        },
      });
    });

    return () => {
      dead = true;
      if (verifyTimerRef.current) clearTimeout(verifyTimerRef.current);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [setJamEnabled, setPlayerReady, setSession, syncPlayerToSession]);

  useEffect(() => {
    const supabase = getBrowserSupabase();

    if (!supabase) {
      const poll = async () => {
        const next = await fetchSession();
        if (next) syncPlayerToSession(next);
      };
      poll();
      const id = window.setInterval(poll, 3000);
      return () => window.clearInterval(id);
    }

    const channel = supabase
      .channel("jam-room-v2")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "listen_session" },
        (payload) => {
          const next = payload.new as ListenSession;
          if (next?.video_id) syncPlayerToSession(next);
        }
      )
      .subscribe();

    fetchSession().then((s) => s && syncPlayerToSession(s));

    return () => {
      supabase.removeChannel(channel);
    };
  }, [syncPlayerToSession]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const s = useListenStore.getState().session;
      const player = playerRef.current;
      if (!s || s.is_paused || !player?.getCurrentTime || syncingRef.current) return;

      const expected = getSyncedPosition(s);
      const current = player.getCurrentTime();
      if (Math.abs(current - expected) > DRIFT_THRESHOLD + 1) {
        suppressEchoUntil.current = Date.now() + ECHO_MS;
        player.seekTo(expected, true);
      }
    }, DRIFT_INTERVAL);

    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!session || session.is_paused) return;

    const tick = () => {
      const s = useListenStore.getState().session;
      if (!s) return;
      setProgress(getSyncedPosition(s));
    };

    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [session, session?.video_id, session?.is_paused, session?.started_at]);

  const togglePlay = async () => {
    if (!session || !playerReady || busy) return;

    if (audioBlocked) {
      unlockAudio();
      return;
    }

    setBusy(true);
    const pos = playerRef.current?.getCurrentTime?.() ?? getSyncedPosition(session);
    const nextPaused = !session.is_paused;

    suppressEchoUntil.current = Date.now() + ECHO_MS;

    const optimistic: ListenSession = {
      ...session,
      is_paused: nextPaused,
      pause_position: pos,
      started_at: nextPaused
        ? session.started_at
        : new Date(Date.now() - pos * 1000).toISOString(),
    };
    appliedFpRef.current = sessionFingerprint(optimistic);
    setSession(optimistic);

    if (nextPaused) {
      playerRef.current?.pauseVideo();
    } else {
      playerRef.current?.unMute?.();
      playerRef.current?.playVideo();
    }

    const updated = await pushPlaybackState(nextPaused, pos);
    if (updated) {
      appliedFpRef.current = sessionFingerprint(updated);
      setSession(updated);
    }

    window.setTimeout(() => setBusy(false), 250);
  };

  const handleBarTap = () => {
    if (audioBlocked) unlockAudio();
    else toggleExpanded();
  };

  const hasSession = !!session?.video_id;
  const showVideo = hasSession && expanded;
  const label = session ? formatJamLabel(session.url) : "";

  const statusLine = audioBlocked
    ? "tap to hear the jam ♪"
    : session?.is_paused
      ? "paused · jam room"
      : "in sync · listening together";

  return (
    <>
      {/* Single player mount — off-screen when minimized so browsers allow playback */}
      <div
        className={
          showVideo
            ? "relative z-20 mx-auto w-full max-w-[420px] px-3 pt-2"
            : "pointer-events-none fixed left-0 top-0 h-[120px] w-[213px] -translate-x-[300vw]"
        }
      >
        <div
          ref={containerRef}
          className={
            showVideo
              ? "aspect-video w-full overflow-hidden rounded-xl bg-black shadow-2xl shadow-black/60 ring-1 ring-white/10"
              : "h-full w-full"
          }
        />
      </div>

      <AnimatePresence>
        {hasSession && (
          <motion.div
            key="jam-bar"
            layout
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="relative z-30 shrink-0 border-t border-white/[0.08] bg-[#0a0a0a]/98 backdrop-blur-xl"
          >
            {audioBlocked && (
              <motion.button
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={unlockAudio}
                className="absolute inset-x-0 -top-10 mx-auto max-w-[420px] px-3"
              >
                <span className="block rounded-full border border-pager-green/40 bg-pager-green/15 py-2 text-center font-handwritten text-base text-pager-green touch-manipulation animate-pulse">
                  tap anywhere to join the jam ♪
                </span>
              </motion.button>
            )}

            <div className="mx-auto max-w-[420px] px-3 py-2.5 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleBarTap}
                  className={`group relative h-12 w-12 shrink-0 overflow-hidden rounded-lg touch-manipulation ring-1 active:scale-95 ${
                    audioBlocked ? "ring-pager-green/60 animate-pulse" : "ring-white/10"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={youtubeThumb(session!.video_id)}
                    alt=""
                    className="h-full w-full object-cover transition group-active:brightness-75"
                  />
                  {!session!.is_paused && !audioBlocked && (
                    <span className="absolute bottom-1 right-1 h-2 w-2 animate-pulse rounded-full bg-pager-green shadow-[0_0_8px_#7cfc00]" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleBarTap}
                  className="min-w-0 flex-1 text-left touch-manipulation"
                >
                  <p className="truncate font-handwritten text-[17px] leading-tight text-neutral-100">
                    {label}
                  </p>
                  <p
                    className={`font-lcd text-[9px] uppercase tracking-[0.2em] ${
                      audioBlocked ? "text-pager-green" : "text-pager-green/80"
                    }`}
                  >
                    {statusLine}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={audioBlocked ? unlockAudio : togglePlay}
                  disabled={!playerReady || busy}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-black shadow-lg shadow-black/40 touch-manipulation active:scale-90 disabled:opacity-40 ${
                    audioBlocked ? "bg-pager-green animate-pulse" : "bg-white"
                  }`}
                  aria-label={audioBlocked ? "Join jam" : session!.is_paused ? "Play" : "Pause"}
                >
                  {audioBlocked ? (
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                      <path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2c0-1.77-1.02-3.29-2.5-4.03v8.06c1.48-.74 2.5-2.26 2.5-4.03z" />
                    </svg>
                  ) : session!.is_paused ? (
                    <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5 fill-current">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                      <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
                    </svg>
                  )}
                </button>
              </div>

              {!session!.is_paused && (
                <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full bg-pager-green/70"
                    animate={{ width: `${Math.min(100, (progress % 300) / 3)}%` }}
                    transition={{ duration: 0.4, ease: "linear" }}
                  />
                </div>
              )}

              {expanded && (
                <motion.button
                  type="button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setExpanded(false)}
                  className="mt-2 w-full py-1 font-lcd text-[9px] uppercase tracking-[0.25em] text-neutral-500 touch-manipulation"
                >
                  minimize
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
