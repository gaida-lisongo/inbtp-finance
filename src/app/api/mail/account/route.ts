import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import crypt from "unix-crypt-td-js";
import fs from "fs";

type ApiHandler = () => Promise<NextResponse>;

type ApiErrorCode =
  | "db_unreachable"
  | "db_auth_failed"
  | "db_missing_config"
  | "maildir_creation_failed"
  | "internal_error";

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

const getStatusFromCode = (code: ApiErrorCode) => {
  if (code === "db_unreachable") {
    return 503;
  }

  if (code === "db_auth_failed" || code === "db_missing_config") {
    return 500;
  }

  if (code === "maildir_creation_failed") {
    return 500;
  }

  return 500;
};

const normalizeError = (error: unknown): { code: ApiErrorCode; message: string } => {
  if (!(error instanceof Error)) {
    return {
      code: "internal_error",
      message: "Unexpected server error",
    };
  }

  const mysqlError = error as Error & { code?: string; errno?: number };

  if (mysqlError.message === "db_port_invalid") {
    return {
      code: "db_missing_config",
      message: "Invalid DB_PORT value. Expected a positive integer.",
    };
  }

  if (mysqlError.code === "ECONNREFUSED" || mysqlError.code === "ETIMEDOUT" || mysqlError.code === "EHOSTUNREACH") {
    const db = getDbConfig();
    return {
      code: "db_unreachable",
      message: `Database unreachable at ${db.host}:${db.port}. Verify DB_HOST/DB_PORT and network access.`,
    };
  }

  if (mysqlError.code === "ER_ACCESS_DENIED_ERROR") {
    return {
      code: "db_auth_failed",
      message: "Database authentication failed. Verify DB_USER and DB_SECRET.",
    };
  }

  if (mysqlError.code === "ENOENT" || mysqlError.code === "EACCES") {
    return {
      code: "maildir_creation_failed",
      message: "Unable to create the maildir on this host. Verify filesystem permissions/path.",
    };
  }

  return {
    code: "internal_error",
    message: error.message || "Unexpected server error",
  };
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
    const { email, password } = await req.json();
    const db = await getDb();

    try {
      const hash = crypt(password, "$6$randomsalt");
      const maildir = `/var/mail/vhosts/inbtp.net/${email}/`;

      await db.execute("INSERT INTO users (email, password, maildir) VALUES (?, ?, ?)", [email, hash, maildir]);
      fs.mkdirSync(maildir, { recursive: true });

      return NextResponse.json({ ok: true, status: "created" });
    } finally {
      await db.end();
    }
  });
}

export async function GET() {
  return withErrorHandling(async () => {
    const db = await getDb();

    try {
      const [rows] = await db.execute("SELECT * FROM users");
      return NextResponse.json({ ok: true, rows });
    } finally {
      await db.end();
    }
  });
}

export async function DELETE(req: Request) {
  return withErrorHandling(async () => {
    const { email } = await req.json();
    const db = await getDb();

    try {
      await db.execute("DELETE FROM users WHERE email = ?", [email]);
      return NextResponse.json({ ok: true, deleted: true });
    } finally {
      await db.end();
    }
  });
}

export async function PUT(req: Request) {
  return withErrorHandling(async () => {
    const { email, password } = await req.json();
    const db = await getDb();

    try {
      const hash = crypt(password, "$6$randomsalt");

      await db.execute("UPDATE users SET password=? WHERE email=?", [hash, email]);

      return NextResponse.json({ ok: true, updated: true });
    } finally {
      await db.end();
    }
  });
}
