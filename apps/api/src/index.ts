import "dotenv/config";
import Fastify from "fastify";
import { registerConfig } from "./plugins/config";
import { authPlugin } from "./plugins/auth";
import { registerInventoryRoutes } from "./modules/inventory/routes";
import { registerStorageRoutes } from "./modules/storage/routes";
import { registerSteamAccountsRoutes } from "./modules/steam-accounts/routes";
import { skinSchemaService } from "./modules/schema/skin-schema.service";
import { registerCronJobs } from "./plugins/cron";

const app = Fastify();
const config = registerConfig(app);

app.get("/health", async () => ({ status: "ok", steamStatus: "idle" }));

async function startServer() {
  try {
    await skinSchemaService.init();
    console.log("Skin schema loaded");
  } catch (error) {
    console.error("Failed to load skin schema", error);
    process.exit(1);
  }

  await app.register(authPlugin);
  await registerInventoryRoutes(app);
  await registerStorageRoutes(app);
  await registerSteamAccountsRoutes(app);

  registerCronJobs();

  app.listen({ port: config.port }).then((address) => {
    console.log(`Server listening at ${address}`);
  });
}

void startServer();
