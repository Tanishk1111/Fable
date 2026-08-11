export interface ListenSession {
  id: number;
  video_id: string;
  url: string;
  started_at: string;
  is_paused: boolean;
  pause_position: number;
}

export function sessionFingerprint(s: ListenSession): string {
  return `${s.video_id}|${s.started_at}|${s.is_paused}|${s.pause_position.toFixed(1)}`;
}

/** Authoritative playback position in seconds */
export function getSyncedPosition(session: ListenSession): number {
  if (session.is_paused) return Math.max(0, session.pause_position);
  const elapsed = (Date.now() - new Date(session.started_at).getTime()) / 1000;
  return Math.max(0, elapsed);
}

export function youtubeThumb(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}

export function formatJamLabel(url: string): string {
  return url
    .replace(/^https?:\/\/(www\.)?/, "")
    .replace(/\?.*$/, "")
    .slice(0, 52);
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement | string,
        config: {
          videoId?: string;
          width?: string | number;
          height?: string | number;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (event: { target: YTPlayer }) => void;
            onStateChange?: (event: { data: number; target: YTPlayer }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getPlayerState: () => number;
  loadVideoById: (videoId: string, startSeconds?: number) => void;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  setVolume: (volume: number) => void;
  destroy: () => void;
}

let apiPromise: Promise<void> | null = null;

export function loadYouTubeAPI(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!document.querySelector('script[src*="iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  });

  return apiPromise;
}

export async function pushPlaybackState(
  is_paused: boolean,
  pause_position: number
): Promise<ListenSession | null> {
  try {
    const res = await fetch("/api/listen", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_paused, pause_position }),
    });
    const data = await res.json();
    return data.session ?? null;
  } catch {
    return null;
  }
}

export async function fetchSession(): Promise<ListenSession | null> {
  try {
    const res = await fetch("/api/listen");
    const data = await res.json();
    return data.session ?? null;
  } catch {
    return null;
  }
}

export function isPlayerPlaying(state: number): boolean {
  const YT = window.YT?.PlayerState;
  if (!YT) return false;
  return state === YT.PLAYING || state === YT.BUFFERING;
}
