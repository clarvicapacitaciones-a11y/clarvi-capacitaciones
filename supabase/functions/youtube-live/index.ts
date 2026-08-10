// Estado de la transmisión en vivo de una capacitación, **sin la API de
// Google**: se lee la página pública de YouTube y se interpretan los datos que
// la propia página trae embebidos para arrancar el reproductor.
//
// Por qué no la Data API: exige proyecto de Google Cloud, llave y cuota
// diaria, y vigilar un directo obliga a sondear —justo lo que gasta la cuota—.
// La página pública trae el mismo dato, sin llave y sin cuota.
//
// ── Lo que hay que saber sobre leer YouTube desde un servidor ──────────────
// YouTube responde a las peticiones que salen de un centro de datos con un
// muro anti-bot: la página llega completa (HTTP 200) pero el bloque rico
// `ytInitialPlayerResponse` viene vacío, con
// `playabilityStatus.status = "LOGIN_REQUIRED"` ("Accede para confirmar que no
// eres un bot"). Comprobado contra YouTube real desde la infraestructura de
// Supabase.
//
// Por eso la lectura tiene dos capas:
//   1. `readPlayerResponse` — el bloque rico (isLive, liveBroadcastDetails,
//      lengthSeconds…). Es el mejor dato y se usa cuando YouTube lo manda.
//   2. `readPageSignals` — señales de `ytInitialData`, que **sí sobreviven al
//      muro anti-bot** y bastan para lo que necesita la plataforma:
//        · `currentVideoEndpoint` → qué video está viendo esa página
//          (sirve para resolver `/@canal/live` → id del directo),
//        · `viewCount.videoViewCountRenderer.isLive: true` → está al aire,
//        · `upcomingEventData.startTime` → hora anunciada,
//        · sin ninguna de las dos → esa página no es un directo.
//
// Y como tercera red, el reproductor del navegador de quien está viendo avisa
// cuando la transmisión termina (RPC `finish_live_broadcast`), así que la
// grabación se publica aunque YouTube se ponga difícil con el servidor.
//
// Se llama desde el navegador (supabase.functions.invoke('youtube-live')):
//   { training_id }            → sincroniza esa capacitación y devuelve su estado
//   { training_id, force }     → ignora el antirebote (solo admin/owner)
//   { probe_url }              → solo lee y reporta, sin tocar la BD (admin/owner)
//
// Cualquier persona aprobada puede sincronizar: es lo que hace que la página
// del directo se entere sola de que la transmisión empezó o terminó. El
// antirebote hace que muchas pestañas abiertas no se traduzcan en muchas
// lecturas a YouTube (una cada 15 s como máximo, la gane quien la gane).

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Ventana del antirebote: no se lee YouTube más seguido que esto. */
const MIN_SECONDS_BETWEEN_CHECKS = 15;
const FETCH_TIMEOUT_MS = 10_000;
/** Una transmisión recién arrancada no se da por terminada por una lectura rara. */
const MIN_LIVE_SECONDS_BEFORE_ENDING = 120;

type LiveStatus = "inactiva" | "programada" | "en_vivo" | "finalizada";

interface LiveInfo {
  videoId: string | null;
  title: string | null;
  status: LiveStatus;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  /** true cuando YouTube contestó el muro anti-bot y se usaron las señales de respaldo. */
  botWall: boolean;
  error: string | null;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Lectura de la página de YouTube ────────────────────────────────────────

// Encabezados de navegador de escritorio. La cookie de consentimiento evita
// que YouTube conteste el muro de cookies en vez de la página del video.
const YOUTUBE_HEADERS: HeadersInit = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "es-MX,es;q=0.9,en;q=0.8",
  "Cookie": "SOCS=CAI; CONSENT=YES+cb",
};

const VIDEO_ID = /^[\w-]{11}$/;

function watchUrl(videoId: string): string {
  // bpctr/has_verified saltan la pantalla de advertencia de contenido, que si
  // no aparece en lugar del reproductor y deja la página sin datos del video.
  return `https://www.youtube.com/watch?v=${videoId}&hl=es&bpctr=9999999999&has_verified=1`;
}

/**
 * Traduce lo que pegó el admin a la página que hay que leer.
 *
 * Acepta el link del directo (o del video ya grabado) y el del canal en
 * cualquiera de sus formas; de un canal se lee `/live`, que es la página que
 * YouTube sirve para "lo que está transmitiendo ahora".
 *
 * `videoId` distinto de null significa que el video ya está fijado y no hay
 * que resolver nada: se vigila ese id hasta que termine.
 */
export function resolveTarget(
  input: string,
): { url: string; videoId: string | null } | null {
  const raw = input.trim();
  if (!raw) return null;

  if (VIDEO_ID.test(raw)) return { url: watchUrl(raw), videoId: raw };
  if (raw.startsWith("@")) {
    const handle = raw.split(/[/\s?]/)[0];
    return { url: `https://www.youtube.com/${handle}/live`, videoId: null };
  }

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  // Solo YouTube: esta función corre en el servidor, así que un link
  // arbitrario la convertiría en un proxy de peticiones salientes.
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const isYoutube = host === "youtube.com" || host.endsWith(".youtube.com") ||
    host === "youtu.be";
  if (!isYoutube) return null;

  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0] ?? "";
    return VIDEO_ID.test(id) ? { url: watchUrl(id), videoId: id } : null;
  }

  const v = url.searchParams.get("v");
  if (v && VIDEO_ID.test(v)) return { url: watchUrl(v), videoId: v };

  // /live/<id> es el link de una transmisión concreta; /live a secas (sin id)
  // es la de "lo que el canal esté transmitiendo".
  const direct = url.pathname.match(/^\/(?:live|embed|shorts|v)\/([\w-]{11})/);
  if (direct) return { url: watchUrl(direct[1]), videoId: direct[1] };

  const channel = url.pathname.match(
    /^\/(@[^/]+|channel\/[^/]+|c\/[^/]+|user\/[^/]+)/,
  );
  if (channel) {
    return { url: `https://www.youtube.com/${channel[1]}/live`, videoId: null };
  }

  return null;
}

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: YOUTUBE_HEADERS,
      redirect: "follow",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`YouTube respondió ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Extrae el objeto JSON que sigue a `<marcador> =` contando llaves.
 *
 * Con una expresión regular no alcanza: el JSON de YouTube trae llaves dentro
 * de cadenas de texto (títulos, descripciones) y cualquier `.*?}` corta a la
 * mitad. Este recorrido respeta comillas y escapes.
 */
export function extractJson(html: string, marker: string): unknown {
  const at = html.indexOf(marker);
  if (at === -1) return null;
  const start = html.indexOf("{", at + marker.length);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < html.length; i++) {
    const char = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth++;
    else if (char === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function pick(source: unknown, ...path: string[]): unknown {
  let value = source;
  for (const key of path) {
    if (typeof value !== "object" || value === null) return undefined;
    value = (value as Record<string, unknown>)[key];
  }
  return value;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function asSeconds(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/** Fecha ISO a partir de un timestamp de YouTube (ISO o epoch en segundos). */
function asDate(value: unknown): string | null {
  const text = asString(value);
  if (!text) return null;
  const date = /^\d+$/.test(text)
    ? new Date(Number(text) * 1000)
    : new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Texto JSON escapado dentro del HTML (`&`, `\"`…) a texto plano. */
function decodeJsonText(raw: string): string | null {
  try {
    return JSON.parse(`"${raw}"`) as string;
  } catch {
    return null;
  }
}

interface PageSignals {
  videoId: string | null;
  title: string | null;
  isLive: boolean;
  scheduledAt: string | null;
  /** La página es la de un video (y no la portada de un canal sin directo). */
  isWatchPage: boolean;
}

/**
 * Señales de `ytInitialData`. Es la capa que sobrevive al muro anti-bot.
 *
 * Se buscan por posición y no parseando el JSON completo: `ytInitialData` pesa
 * cientos de KB y su forma cambia seguido, mientras que estas cuatro marcas
 * llevan años estables. Cada una se acota a su vecindario para no confundirla
 * con la de un video recomendado de la barra lateral.
 */
export function readPageSignals(html: string): PageSignals {
  // Qué video es el de ESTA página. La primera aparición suelta de
  // `"videoId"` no sirve: suele ser la de un recomendado.
  let videoId: string | null = null;
  const endpointAt = html.indexOf('"currentVideoEndpoint"');
  if (endpointAt !== -1) {
    videoId = html.slice(endpointAt, endpointAt + 500)
      .match(/\/watch\?v=([\w-]{11})/)?.[1] ?? null;
  }
  if (!videoId) {
    videoId = html.match(
      /<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/,
    )?.[1] ?? null;
  }

  // El contador de espectadores dice `isLive` solo cuando está al aire
  // ("1,339 personas mirando ahora").
  const viewCountAt = html.indexOf('"viewCount":{"videoViewCountRenderer"');
  const isLive = viewCountAt !== -1 &&
    html.slice(viewCountAt, viewCountAt + 400).includes('"isLive":true');

  // Directo anunciado y todavía sin empezar.
  let scheduledAt: string | null = null;
  const upcomingAt = html.indexOf('"upcomingEventData"');
  if (upcomingAt !== -1) {
    const startTime = html.slice(upcomingAt, upcomingAt + 300)
      .match(/"startTime":"(\d+)"/)?.[1];
    if (startTime) scheduledAt = asDate(startTime);
  }

  // El título del video es el último texto antes del contador de vistas.
  let title: string | null = null;
  if (viewCountAt !== -1) {
    const before = html.slice(Math.max(0, viewCountAt - 500), viewCountAt);
    const runs = [...before.matchAll(/"text":"((?:[^"\\]|\\.)*)"/g)];
    const last = runs[runs.length - 1]?.[1];
    if (last) title = decodeJsonText(last);
  }

  return {
    videoId,
    title,
    isLive,
    scheduledAt,
    isWatchPage: videoId !== null && endpointAt !== -1,
  };
}

interface PlayerReading {
  /** null cuando YouTube no mandó un estado utilizable (muro anti-bot). */
  status: LiveStatus | null;
  videoId: string | null;
  title: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  botWall: boolean;
  error: string | null;
}

/**
 * El bloque rico del reproductor, cuando YouTube lo manda:
 *   · playabilityStatus.status  → OK / LIVE_STREAM_OFFLINE / LOGIN_REQUIRED…
 *   · videoDetails              → videoId, title, isLive, isUpcoming, lengthSeconds
 *   · microformat…liveBroadcastDetails → isLiveNow, startTimestamp, endTimestamp
 */
export function readPlayerResponse(html: string): PlayerReading {
  const empty: PlayerReading = {
    status: null,
    videoId: null,
    title: null,
    scheduledAt: null,
    startedAt: null,
    endedAt: null,
    durationSeconds: null,
    botWall: false,
    error: null,
  };

  const player = extractJson(html, "ytInitialPlayerResponse");
  if (!player) return empty;

  const playability = asString(pick(player, "playabilityStatus", "status")) ??
    "";
  const reason = asString(pick(player, "playabilityStatus", "reason"));
  const details = pick(player, "videoDetails");
  const micro = pick(player, "microformat", "playerMicroformatRenderer");
  const broadcast = pick(micro, "liveBroadcastDetails");

  const videoId = asString(pick(details, "videoId"));
  const title = asString(pick(details, "title")) ??
    asString(pick(micro, "title", "simpleText"));
  const startedAt = asDate(pick(broadcast, "startTimestamp"));
  const endedAt = asDate(pick(broadcast, "endTimestamp"));
  const length = asSeconds(pick(details, "lengthSeconds"));

  // Muro anti-bot: el bloque llega sin datos del video. No es un error del
  // canal ni del link, así que no se reporta como tal: se usa la otra capa.
  if (playability === "LOGIN_REQUIRED" || !details) {
    return { ...empty, videoId, title, botWall: true };
  }

  if (playability === "ERROR" || playability === "UNPLAYABLE") {
    return {
      ...empty,
      videoId,
      title,
      error: reason ?? "El video no está disponible (¿privado o borrado?)",
    };
  }

  const isLiveNow = pick(broadcast, "isLiveNow") === true ||
    pick(details, "isLive") === true;
  const isUpcoming = pick(details, "isUpcoming") === true;
  const isLiveContent = pick(details, "isLiveContent") === true;

  let status: LiveStatus | null = null;
  if (isLiveNow) status = "en_vivo";
  else if (isUpcoming || playability === "LIVE_STREAM_OFFLINE") {
    status = "programada";
  } else if (endedAt || isLiveContent || (videoId && length)) {
    // Terminó (o nunca fue un directo, sino un video normal): en ambos casos
    // hay una grabación lista para usarse.
    status = "finalizada";
  }

  const broadcastSeconds = startedAt && endedAt
    ? Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 1000)
    : null;

  return {
    status,
    videoId,
    title,
    scheduledAt: asDate(
      pick(
        player,
        "playabilityStatus",
        "liveStreamability",
        "liveStreamabilityRenderer",
        "offlineSlate",
        "liveStreamOfflineSlateRenderer",
        "scheduledStartTime",
      ),
    ) ?? (isUpcoming ? startedAt : null),
    startedAt,
    endedAt,
    durationSeconds: length ??
      (broadcastSeconds && broadcastSeconds > 0 ? broadcastSeconds : null),
    botWall: false,
    error: null,
  };
}

/** Junta las dos capas: manda el bloque del reproductor y respalda la página. */
export function interpret(html: string, monitoredId: string | null): LiveInfo {
  const player = readPlayerResponse(html);
  const page = readPageSignals(html);

  const videoId = player.videoId ?? page.videoId ?? monitoredId;
  const title = player.title ?? page.title;
  const scheduledAt = player.scheduledAt ?? page.scheduledAt;

  if (player.status) {
    return {
      videoId,
      title,
      status: player.status,
      scheduledAt,
      startedAt: player.startedAt,
      endedAt: player.endedAt,
      durationSeconds: player.durationSeconds,
      botWall: false,
      error: null,
    };
  }

  const base = {
    videoId,
    title,
    scheduledAt,
    startedAt: player.startedAt,
    endedAt: player.endedAt,
    durationSeconds: player.durationSeconds,
    botWall: player.botWall,
  };

  if (player.error && !page.isLive) {
    return { ...base, status: "inactiva", error: player.error };
  }
  if (page.isLive) return { ...base, status: "en_vivo", error: null };
  if (page.scheduledAt) return { ...base, status: "programada", error: null };
  if (page.isWatchPage) return { ...base, status: "finalizada", error: null };

  // Ni directo ni video: la portada del canal, que es lo que YouTube sirve
  // cuando `/live` no tiene nada al aire.
  return {
    ...base,
    status: "inactiva",
    error: "El canal no tiene una transmisión al aire en este momento",
  };
}

// ── Función ────────────────────────────────────────────────────────────────

interface TrainingRow {
  id: string;
  title: string;
  youtube_video_id: string | null;
  duration_seconds: number | null;
  live_enabled: boolean;
  live_source_url: string | null;
  live_video_id: string | null;
  live_status: LiveStatus;
  live_title: string | null;
  live_scheduled_at: string | null;
  live_started_at: string | null;
  live_ended_at: string | null;
  live_checked_at: string | null;
  live_error: string | null;
}

function stateOf(training: TrainingRow) {
  return {
    training_id: training.id,
    live_enabled: training.live_enabled,
    live_status: training.live_status,
    live_video_id: training.live_video_id,
    live_title: training.live_title,
    live_scheduled_at: training.live_scheduled_at,
    live_started_at: training.live_started_at,
    live_ended_at: training.live_ended_at,
    live_checked_at: training.live_checked_at,
    live_error: training.live_error,
    youtube_video_id: training.youtube_video_id,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Método no permitido" }, 405);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Solicitud inválida" }, 400);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // La llave anon también es un JWT válido, así que verificarla no autentica a
  // nadie: quien manda es el token de sesión del usuario.
  const token = (req.headers.get("Authorization") ?? "").replace(
    /^Bearer\s+/i,
    "",
  );
  const { data: userData } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (!user) return json({ error: "No autenticado" }, 401);

  const { data: profile } = await admin
    .from("profiles")
    .select("role, is_active, approval_status")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_active || profile.approval_status !== "aprobado") {
    return json({ error: "Cuenta sin acceso a la plataforma" }, 403);
  }
  const isAdmin = profile.role === "administrador" || profile.role === "owner";

  // ── Modo prueba: leer un link y reportar, sin tocar la base ──────────────
  if (typeof body.probe_url === "string") {
    if (!isAdmin) return json({ error: "Solo administradores" }, 403);
    const target = resolveTarget(body.probe_url);
    if (!target) return json({ error: "Ese link no es de YouTube" }, 400);
    try {
      const info = interpret(await fetchHtml(target.url), target.videoId);
      return json({ ok: true, url: target.url, info }, 200);
    } catch (err) {
      return json(
        { error: err instanceof Error ? err.message : "No se pudo leer YouTube" },
        502,
      );
    }
  }

  const trainingId = String(body.training_id ?? "");
  if (!trainingId) return json({ error: "Falta training_id" }, 400);

  const { data, error: loadError } = await admin
    .from("trainings")
    .select(
      "id, title, youtube_video_id, duration_seconds, live_enabled, live_source_url," +
        " live_video_id, live_status, live_title, live_scheduled_at, live_started_at," +
        " live_ended_at, live_checked_at, live_error",
    )
    .eq("id", trainingId)
    .maybeSingle();

  if (loadError) return json({ error: loadError.message }, 500);
  const training = data as TrainingRow | null;
  if (!training) return json({ error: "Capacitación no encontrada" }, 404);

  // Transmisión apagada: no se consulta nada.
  if (!training.live_enabled) {
    return json({ ok: true, state: stateOf(training) }, 200);
  }

  const force = body.force === true && isAdmin;
  const now = new Date();

  // Antirebote atómico: quien logre mover `live_checked_at` es quien va a
  // YouTube; el resto de las pestañas se lleva el estado que ya hay guardado.
  // Sin esto, cien personas viendo el directo serían cien lecturas por minuto.
  if (!force) {
    const cutoff = new Date(now.getTime() - MIN_SECONDS_BETWEEN_CHECKS * 1000)
      .toISOString();
    const { data: claimed } = await admin
      .from("trainings")
      .update({ live_checked_at: now.toISOString() })
      .eq("id", trainingId)
      .or(`live_checked_at.is.null,live_checked_at.lt."${cutoff}"`)
      .select("id");
    if (!claimed || claimed.length === 0) {
      return json({ ok: true, state: stateOf(training), cached: true }, 200);
    }
  }

  const source = training.live_video_id ?? training.live_source_url ?? "";
  const target = resolveTarget(source);
  if (!target) {
    const patch = {
      live_checked_at: now.toISOString(),
      live_error: source
        ? "El link de la transmisión no es de YouTube"
        : "Falta el link del canal o de la transmisión",
    };
    await admin.from("trainings").update(patch).eq("id", trainingId);
    return json({ ok: true, state: { ...stateOf(training), ...patch } }, 200);
  }

  let info: LiveInfo;
  try {
    info = interpret(await fetchHtml(target.url), target.videoId);
  } catch (err) {
    // YouTube caído, lento o bloqueando: se anota el error y se conserva el
    // estado anterior. Una lectura fallida no puede tumbar un directo en curso.
    const patch = {
      live_checked_at: now.toISOString(),
      live_error: err instanceof Error ? err.message : "No se pudo leer YouTube",
    };
    await admin.from("trainings").update(patch).eq("id", trainingId);
    return json({ ok: true, state: { ...stateOf(training), ...patch } }, 200);
  }

  const startedAt = training.live_started_at ?? info.startedAt;
  const liveSeconds = startedAt
    ? (now.getTime() - Date.parse(startedAt)) / 1000
    : null;

  // Qué estado se guarda, con las salvaguardas propias de leer YouTube desde
  // un servidor (ver el encabezado del archivo).
  let status: LiveStatus = info.status;
  let error = info.error;

  // Nada legible (canal sin directo todavía, video privado, marcado nuevo):
  // se conserva el estado anterior y solo se anota el motivo.
  if (info.status === "inactiva" && info.error) {
    status = training.live_status;
  }

  // Bajo el muro anti-bot no se distingue "todavía no empieza" de "ya
  // terminó": las dos son una página de video sin la marca de "al aire". Así
  // que no se publica una grabación por suposición; se espera a verla al aire
  // (o a que un admin la publique a mano desde la ficha).
  if (
    status === "finalizada" && info.botWall &&
    training.live_status !== "en_vivo"
  ) {
    status = training.live_status === "inactiva"
      ? "programada"
      : training.live_status;
    error =
      "YouTube no confirma el estado desde el servidor; se marcará al aire en cuanto empiece la transmisión.";
  }

  // Una transmisión que acaba de arrancar no se da por terminada: en el
  // primer minuto la página puede llegar todavía sin la marca de "al aire".
  if (
    status === "finalizada" && training.live_status === "en_vivo" &&
    liveSeconds !== null && liveSeconds < MIN_LIVE_SECONDS_BEFORE_ENDING
  ) {
    status = "en_vivo";
  }

  const patch: Record<string, unknown> = {
    live_checked_at: now.toISOString(),
    live_error: error,
    live_status: status,
    live_video_id: info.videoId ?? training.live_video_id,
    live_title: info.title ?? training.live_title,
    live_scheduled_at: info.scheduledAt ?? training.live_scheduled_at,
  };

  if (status === "en_vivo" && !training.live_started_at) {
    patch.live_started_at = info.startedAt ?? now.toISOString();
  }

  const justEnded = status === "finalizada" &&
    training.live_status !== "finalizada";
  const duration = info.durationSeconds ??
    (liveSeconds && liveSeconds > 0 ? Math.round(liveSeconds) : null);

  if (justEnded) {
    patch.live_ended_at = info.endedAt ?? now.toISOString();
    // La transmisión terminó: se apaga sola para dejar de consultar YouTube.
    patch.live_enabled = false;
    // Aquí está el punto de todo esto: la grabación queda publicada sin que
    // nadie tenga que cargarla. No se pisa un video ya cargado a mano.
    if (!training.youtube_video_id && (info.videoId ?? training.live_video_id)) {
      patch.youtube_video_id = info.videoId ?? training.live_video_id;
    }
    if (!training.duration_seconds && duration) {
      patch.duration_seconds = duration;
    }
  }

  const { error: updateError } = await admin
    .from("trainings")
    .update(patch)
    .eq("id", trainingId);
  if (updateError) return json({ error: updateError.message }, 500);

  let credited = 0;
  if (justEnded && duration) {
    // El tiempo que cada quien estuvo en el directo se vuelve progreso de la
    // grabación (y con ello se completa, y se emite diploma, quien llegó al 90%).
    const { data: creditedRows } = await admin.rpc("credit_live_attendance", {
      p_training_id: trainingId,
      p_duration: duration,
    });
    credited = typeof creditedRows === "number" ? creditedRows : 0;
  }

  return json(
    {
      ok: true,
      state: { ...stateOf(training), ...patch },
      credited,
      bot_wall: info.botWall,
    },
    200,
  );
});
