import fp from "fastify-plugin";

import { supabaseAdmin } from "../core/supabase";

declare module "fastify" {
  interface FastifyRequest {
    user?: { userId: string } | null;
  }
}

const authPlugin = fp(async (app) => {
  app.addHook("onRequest", async (request) => {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      request.user = null;
      return;
    }

    const token = authHeader.slice("Bearer ".length).trim();

    if (!token) {
      request.user = null;
      return;
    }

    try {
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      request.user = !error && data.user ? { userId: data.user.id } : null;
    } catch {
      request.user = null;
    }
  });
});

export { authPlugin };
