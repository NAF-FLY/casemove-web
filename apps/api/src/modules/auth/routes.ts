import type { FastifyInstance } from "fastify";

import { signToken } from "../../core/jwt";
import { steamManager } from "../../core/steam-manager";

type LoginBody = {
  username: string;
  password: string;
  twoFactorCode?: string;
};

export function registerAuthRoutes(app: FastifyInstance) {
  app.post<{ Body: LoginBody }>("/auth/login", async (request, reply) => {
    const { username, password, twoFactorCode } = request.body;
    const timeoutMs = 20000;
    let timeoutId: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error("Steam login timeout")),
        timeoutMs
      );
    });

    try {
      const client = await Promise.race([
        steamManager.init({ username, password, twoFactorCode }),
        timeoutPromise
      ]);
      const token = signToken({ userId: "local" });
      const personaName = client.getPersonaName();

      return { token, steamStatus: "connected", personaName };
    } catch (error) {
      const message =
        error instanceof Error &&
        (error.message === "Steam Guard required" ||
          error.message === "Steam Guard code incorrect" ||
          error.message === "Steam login timeout")
          ? error.message
          : error instanceof Error && error.message
            ? error.message
            : "Steam login failed";
      const statusCode =
        error instanceof Error && error.message === "Steam login timeout"
          ? 504
          : 401;

      return reply.code(statusCode).send({ message });
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  });

  app.post("/auth/logout", async () => {
    steamManager.logout();
    return { ok: true };
  });
}
