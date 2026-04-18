import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

type ApiHandler = () => Promise<NextResponse>;

type ApiErrorCode =
  | "validation_error"
  | "db_unreachable"
  | "db_auth_failed"
  | "db_missing_config"
  | "maildir_creation_failed"
  | "maildir_permission_failed"
  | "internal_error";

const execFileAsync = promisify(execFile);
const MAIL_ROOT = process.env.MAIL_VHOST_ROOT?.trim() || "";

const readEnv = (...keys: string[]) => {
  for (const key of keys) {
    const value = process.env[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
};

const parsePort = (value: string | null, fallback: number) => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("db_port_invalid");
  }

  return parsed;
};

const getDbConfig = () => {
  const host = readEnv("DB_HOST") ?? "localhost";
  const user = readEnv("DB_USER") ?? "mailuser";
  const password = readEnv("DB_SECRET") ?? "admin";
  const database = readEnv("DB_NAME") ?? "mailserver";
  const port = parsePort(readEnv("DB_PORT"), 3306);

  return { host, user, password, database, port };
};

const getDb = async () =>
  mysql.createConnection({
    ...getDbConfig(),
    connectTimeout: 8000,
  });

const parseMailbox = (email: string) => {
  const normalized = email.trim().toLowerCase();

  if (!normalized) {
    throw new Error("invalid_email");
  }

  const [localPart, domain] = normalized.split("@");

  if (!localPart || !domain) {
    throw new Error("invalid_email");
  }

  const relativeMaildir = `${domain}/${localPart}/`;
  return { email: normalized, localPart, domain, relativeMaildir };
};

const randomSalt = (length = 16) => {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789./";
  const bytes = randomBytes(length);

  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
};

const buildDovecotHash = async (password: string) => {
  if (!password) {
    throw new Error("invalid_password");
  }

  const salt = randomSalt();
  let raw = "";

  try {
    const { stdout } = await execFileAsync("openssl", ["passwd", "-6", "-salt", salt, password]);
    raw = stdout.trim();
  } catch (error) {
    const commandError = error as Error & { code?: string };
    if (commandError.code === "ENOENT") {
      throw new Error("openssl_missing");
    }
    throw new Error("hash_generation_failed");
  }

  if (!raw || !raw.startsWith("$6$")) {
    throw new Error("hash_generation_failed");
  }

  return `{SHA512-CRYPT}${raw}`;
};

const getStatusFromCode = (code: ApiErrorCode) => {
  if (code === "validation_error") {
    return 400;
  }

  if (code === "db_unreachable") {
    return 503;
  }

  return 500;
};

const normalizeError = (error: unknown): { code: ApiErrorCode; message: string } => {
  if (!(error instanceof Error)) {
    return { code: "internal_error", message: "Unexpected server error" };
  }

  const mysqlError = error as Error & { code?: string };

  if (
    error.message === "invalid_email" ||
    error.message === "invalid_password" ||
    error.message === "hash_generation_failed" ||
    error.message === "openssl_missing"
  ) {
    return { code: "validation_error", message: "Invalid payload. Provide non-empty email/password and an email with user@domain." };
  }

  if (error.message === "db_port_invalid") {
    return { code: "db_missing_config", message: "Invalid DB_PORT value. Expected a positive integer." };
  }

  if (mysqlError.code === "ER_DUP_ENTRY") {
    return { code: "validation_error", message: "Email already exists." };
  }

  if (mysqlError.code === "ECONNREFUSED" || mysqlError.code === "ETIMEDOUT" || mysqlError.code === "EHOSTUNREACH") {
    const db = getDbConfig();
    return {
      code: "db_unreachable",
      message: `Database unreachable at ${db.host}:${db.port}. Verify DB_HOST/DB_PORT and network access.`,
    };
  }

  if (mysqlError.code === "ER_ACCESS_DENIED_ERROR") {
    return { code: "db_auth_failed", message: "Database authentication failed. Verify DB_USER and DB_SECRET." };
  }

  if (error.message === "maildir_chown_failed" || error.message === "chown_command_missing") {
    return { code: "maildir_permission_failed", message: "Maildir created but chown to vmail:vmail failed." };
  }

  return { code: "internal_error", message: error.message || "Unexpected server error" };
};

const withErrorHandling = async (handler: ApiHandler) => {
  try {
    return await handler();
  } catch (error) {
    const normalizedError = normalizeError(error);

    console.error("Mail account API error", error);

    return NextResponse.json(
      {
        ok: false,
        code: normalizedError.code,
        message: normalizedError.message,
      },
      { status: getStatusFromCode(normalizedError.code) },
    );
  }
};

export async function POST(req: Request) {
  return withErrorHandling(async () => {
    const payload = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
    const mailbox = parseMailbox(payload.email ?? "");
    const hash = await buildDovecotHash(payload.password ?? "");
    const db = await getDb();

    try {
      // SQL parameters prevent injection.
      await db.execute("INSERT INTO users (email, password, maildir) VALUES (?, ?, ?)", [
        mailbox.email,
        hash,
        mailbox.relativeMaildir,
      ]);
    } finally {
      await db.end();
    }

    return NextResponse.json({
      ok: true,
      status: "created",
      account: {
        email: mailbox.email,
        maildir: mailbox.relativeMaildir,
      },
    });
  });
}

export async function GET() {
  return withErrorHandling(async () => {
    const db = await getDb();

    try {
      const [rows] = await db.execute("SELECT email, maildir FROM users ORDER BY email ASC");
      return NextResponse.json({ ok: true, rows });
    } finally {
      await db.end();
    }
  });
}

export async function DELETE(req: Request) {
  return withErrorHandling(async () => {
    const payload = (await req.json().catch(() => ({}))) as { email?: string };
    const mailbox = parseMailbox(payload.email ?? "");
    const db = await getDb();

    try {
      await db.execute("DELETE FROM users WHERE email = ?", [mailbox.email]);
      return NextResponse.json({ ok: true, deleted: true });
    } finally {
      await db.end();
    }
  });
}

export async function PUT(req: Request) {
  return withErrorHandling(async () => {
    const payload = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
    const mailbox = parseMailbox(payload.email ?? "");
    const hash = await buildDovecotHash(payload.password ?? "");
    const db = await getDb();

    try {
      await db.execute("UPDATE users SET password = ? WHERE email = ?", [hash, mailbox.email]);
      return NextResponse.json({ ok: true, updated: true });
    } finally {
      await db.end();
    }
  });
}
