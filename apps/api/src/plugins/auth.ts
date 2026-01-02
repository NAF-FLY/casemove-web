import fp from "fastify-plugin";

import { verifyToken } from "../core/jwt";

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

    const payload = verifyToken(token);
    request.user = { userId: payload.userId };
  });
});

export { authPlugin };
