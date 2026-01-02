import jwt from "jsonwebtoken";

type TokenPayload = {
  userId: string;
};

function getSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }

  return secret;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, getSecret(), {
    algorithm: "HS256",
    expiresIn: "7d"
  });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, getSecret(), {
    algorithms: ["HS256"]
  }) as TokenPayload;
}
