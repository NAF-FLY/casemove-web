import 'dotenv/config';
import jwt from "jsonwebtoken";

const secret = process.env.SUPABASE_JWT_SECRET;
if (!secret) {
  throw new Error("SUPABASE_JWT_SECRET not found in environment variables");
}

const serviceRolePayload = {
  iss: "supabase",
  ref: "casemove-web",
  role: "service_role",
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60 * 10) // 10 years
};

const anonPayload = {
  iss: "supabase",
  ref: "casemove-web",
  role: "anon",
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60 * 10) // 10 years
};

const serviceRoleToken = jwt.sign(serviceRolePayload, secret, { algorithm: "HS256" });
const anonToken = jwt.sign(anonPayload, secret, { algorithm: "HS256" });
