import type { FastifyInstance } from "fastify";

import { steamManager } from "../../core/steam-manager";
import { getInventory } from "./service";

export async function registerInventoryRoutes(app: FastifyInstance) {
  app.get("/inventory", async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    try {
      const client = steamManager.getActiveClient(request.user.userId);
      const items = await getInventory(client);

      return { items };
    } catch (error) {
      console.error("Failed to load inventory", error);
      return reply.code(500).send({ message: "Failed to load inventory" });
    }
  });
}
