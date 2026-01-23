
import jwt from "jsonwebtoken";

const secret = "super-secure-jwt-secret-key-for-local-development-12345";

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

console.log("SERVICE_ROLE_KEY=" + serviceRoleToken);
console.log("ANON_KEY=" + anonToken);
