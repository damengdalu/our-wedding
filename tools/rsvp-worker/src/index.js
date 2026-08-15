export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    let payload;
    try {
      payload = JSON.parse(await request.text());
    } catch (e) {
      return respond(env, { ok: false, error: "bad_json" }, 400);
    }

    const name = String(payload.name || "").trim();
    const email = String(payload.email || "").trim();
    const attending = String(payload.attending || "").trim();

    if (!name || !email || !attending) {
      return respond(env, { ok: false, error: "missing_fields" }, 400);
    }

    await env.DB.prepare(
      `INSERT INTO rsvps (name, email, attending, plus_one, plus_one_name, dietary, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        name,
        email,
        attending,
        String(payload.plus_one || "").trim(),
        String(payload.plus_one_name || "").trim(),
        String(payload.dietary || "").trim(),
        String(payload.note || "").trim(),
        new Date().toISOString()
      )
      .run();

    return respond(env, { ok: true }, 200);
  },
};

function respond(env, body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "",
    },
  });
}
