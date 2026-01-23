import fp from "fastify-plugin";
import jwt from "jsonwebtoken";

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

    // 1. Try Local Verification if secret is available
    if (process.env.SUPABASE_JWT_SECRET) {
      try {
        const secret = process.env.SUPABASE_JWT_SECRET;
        // Verify token (HS256 is default for Supabase if jwt_secret is set)
        const decoded = jwt.verify(token, secret) as { sub: string, role?: string };
        request.user = { userId: decoded.sub };
        return; // Success! Skip network call
      } catch (err: any) {
        request.log.warn({ err }, "Local JWT verification failed, falling back to getUser");
      }
    }

    try {
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (error) {
         request.log.error({ error }, "Supabase getUser failed");
      }
      request.user = !error && data.user ? { userId: data.user.id } : null;
    } catch (err) {
      request.log.error({ err }, "Unexpected error in auth plugin");
      request.user = null;
    }

  });
});

export { authPlugin };
