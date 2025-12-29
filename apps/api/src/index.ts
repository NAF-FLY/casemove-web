import Fastify from "fastify";
import { registerConfig } from "./plugins/config";
import { registerInventoryRoutes } from "./modules/inventory/routes";

const app = Fastify({ logger: true });
const config = registerConfig(app);

app.get("/health", async () => ({ status: "ok" }));
registerInventoryRoutes(app);

app.listen({ port: config.port, host: config.host }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
