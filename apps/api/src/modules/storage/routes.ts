import type { FastifyInstance } from "fastify";

import { getStorageItemsMock, getStorageUnitsMock } from "./service";

export async function registerStorageRoutes(app: FastifyInstance) {
  app.get("/storage", async () => {
    const units = await getStorageUnitsMock();

    return { units };
  });

  app.get<{ Params: { id: string } }>("/storage/:id", async (request) => {
    const items = await getStorageItemsMock(request.params.id);

    return { items };
  });
}
