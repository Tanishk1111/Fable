export function getYoutubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("/")[0] || null;
    if (u.pathname.includes("/shorts/")) return u.pathname.split("/shorts/")[1]?.split("/")[0] ?? null;
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    if (u.pathname.includes("/embed/")) return u.pathname.split("/embed/")[1]?.split("/")[0] ?? null;
  } catch {
    return null;
  }
  return null;
}

export function getSpotifyEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("spotify.com")) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const [type, id] = parts;
    if (!["track", "album", "playlist", "episode"].includes(type)) return null;
    return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
  } catch {
    return null;
  }
}

export function getEmbedForUrl(url: string): { type: "youtube"; id: string } | { type: "spotify"; src: string } | null {
  const yt = getYoutubeId(url);
  if (yt) return { type: "youtube", id: yt };
  const sp = getSpotifyEmbed(url);
  if (sp) return { type: "spotify", src: sp };
  return null;
}
