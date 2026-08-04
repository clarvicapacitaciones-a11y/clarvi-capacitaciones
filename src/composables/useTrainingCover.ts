// Portada de una capacitación para las tarjetas y la ficha.
//
// Orden de preferencia:
//   1. La imagen que el admin eligió (cover_image_url).
//   2. La miniatura del video de YouTube, si ya hay video.
//   3. Nada: la tarjeta pinta un marcador de posición con la marca.

/** Miniatura grande (1280×720). No existe para todos los videos. */
export function youtubeThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
}

/** Miniatura chica (480×360). Existe siempre; sirve de respaldo. */
export function youtubeThumbnailFallback(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
}

export function coverImageUrl(
  coverImage: string | null | undefined,
  youtubeVideoId: string | null | undefined,
): string | null {
  const custom = coverImage?.trim()
  if (custom) return custom
  if (youtubeVideoId) return youtubeThumbnail(youtubeVideoId)
  return null
}

/**
 * Respaldo cuando la imagen no carga: si era la miniatura grande de YouTube
 * (que no todos los videos tienen), se intenta con la chica. Devuelve null
 * cuando ya no hay nada más que intentar.
 */
export function coverFallbackUrl(
  failedUrl: string,
  youtubeVideoId: string | null | undefined,
): string | null {
  if (!youtubeVideoId) return null
  if (failedUrl === youtubeThumbnail(youtubeVideoId)) {
    return youtubeThumbnailFallback(youtubeVideoId)
  }
  return null
}
