import type { FastifyInstance } from "fastify";

type AppConfig = {
  host: string;
  port: number;
};

export function registerConfig(app: FastifyInstance): AppConfig {
  const host = process.env.HOST ?? "0.0.0.0";
  const defaultPort = 4000;
  const envPort = process.env.PORT;
  let port = Number(envPort ?? defaultPort);

  if (envPort && (!Number.isFinite(port) || port <= 0)) {
    app.log.warn(
      { port: envPort },
      "Invalid PORT env var, falling back to default"
    );
    port = defaultPort;
  }

  return { host, port };
}
