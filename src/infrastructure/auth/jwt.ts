import jwt from "jsonwebtoken";

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set and at least 32 characters");
  }
  return secret;
}

export type AccessTokenPayload = {
  sub: string;
  email: string;
};

export function issueAccessToken(user: { id: string; email: string }): {
  token: string;
  expiresAt: Date;
} {
  const expiresIn = ACCESS_TOKEN_TTL_SECONDS;
  const token = jwt.sign({ email: user.email }, getSecret(), {
    subject: user.id,
    expiresIn,
    algorithm: "HS256",
  });
  return {
    token,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
  };
}

export async function verifyAccessToken(
  token: string,
): Promise<AccessTokenPayload | null> {
  try {
    const decoded = jwt.verify(token, getSecret(), { algorithms: ["HS256"] });
    if (typeof decoded === "string") return null;
    const sub = decoded.sub;
    const email = (decoded as jwt.JwtPayload).email;
    if (typeof sub !== "string" || typeof email !== "string") return null;
    return { sub, email };
  } catch {
    return null;
  }
}
