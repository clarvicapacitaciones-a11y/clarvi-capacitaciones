// Registro de cuentas de la plataforma de capacitaciones.
//
// Ambos métodos de registro pasan por aquí (no por auth.signUp del cliente)
// para crear las cuentas ya confirmadas con la service role key, sin depender
// de envío de correos:
//   - method "email":    correo real, solo dominio @clarvi.com
//   - method "username": sin correo; se genera el correo sintético
//                        <usuario>@users.internal.clarvi (dominio reservado)
//
// La base de datos re-valida ambas reglas con un trigger BEFORE INSERT en
// auth.users, por lo que esta función no es la única línea de defensa.

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

  const method = body.method === "username" ? "username" : "email";
  const password = String(body.password ?? "");
  const fullName = String(body.full_name ?? "").trim();
  const areaId = String(body.area_id ?? "").trim();
  const sucursalId = String(body.sucursal_id ?? "").trim();

  if (password.length < 8) {
    return json({ error: "La contraseña debe tener al menos 8 caracteres" }, 400);
  }
  if (fullName.length < 3) {
    return json({ error: "Escribe tu nombre completo" }, 400);
  }
  if (!areaId || !sucursalId) {
    return json({ error: "Selecciona tu área y sucursal" }, 400);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  let email: string;
  const metadata: Record<string, unknown> = {
    signup_method: method,
    full_name: fullName,
    area_id: areaId,
    sucursal_id: sucursalId,
  };

  if (method === "username") {
    const usernameRaw = String(body.username ?? "").trim();
    if (!/^[a-zA-Z0-9._-]{3,30}$/.test(usernameRaw)) {
      return json(
        { error: "Usuario inválido: 3 a 30 caracteres (letras, números, . _ -)" },
        400,
      );
    }
    const username = usernameRaw.toLowerCase();
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (existing) {
      return json({ error: "Ese nombre de usuario ya está registrado" }, 409);
    }
    email = `${username}@users.internal.clarvi`;
    metadata.username = username;
  } else {
    email = String(body.email ?? "").trim().toLowerCase();
    if (!/^[^@\s]+@clarvi\.com$/.test(email)) {
      return json({ error: "El correo debe ser del dominio @clarvi.com" }, 400);
    }
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });

  if (error) {
    const duplicated = /already|registered|exists/i.test(error.message);
    return json(
      {
        error: duplicated
          ? "Ya existe una cuenta con ese correo o usuario"
          : error.message,
      },
      duplicated ? 409 : 400,
    );
  }

  return json({ ok: true, user_id: data.user?.id }, 200);
});
