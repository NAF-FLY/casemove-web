import type { FastifyInstance } from "fastify";
import { getInventoryMock } from "./service";

export function registerInventoryRoutes(app: FastifyInstance) {
  app.get("/inventory", async () => ({ items: getInventoryMock() }));
}
