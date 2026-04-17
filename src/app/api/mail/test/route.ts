import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

const readEnv = (key: string) => {
  const value = process.env[key];

  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return null;
};

const parsePort = (value: string | null) => {
  if (!value) {
    return 587;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("mail_port_invalid");
  }

  return parsed;
};

const parseBoolean = (value: string | null, fallback: boolean) => {
  if (!value) {
    return fallback;
  }

  const normalized = value.toLowerCase();

  if (["true", "1", "yes"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no"].includes(normalized)) {
    return false;
  }

  throw new Error("mail_secure_invalid");
};

const buildEnvConfig = (): SmtpConfig => {
  const host = readEnv("MAIL_HOST");
  const user = readEnv("MAIL_USER");
  const pass = readEnv("MAIL_PASS");
  const from = readEnv("MAIL_FROM") ?? user;
  const port = parsePort(readEnv("MAIL_PORT"));
  const secure = parseBoolean(readEnv("MAIL_SECURE"), false);

  if (!host) {
    throw new Error("mail_host_missing");
  }

  if (!user) {
    throw new Error("mail_user_missing");
  }

  if (!pass) {
    throw new Error("mail_pass_missing");
  }

  if (!from) {
    throw new Error("mail_from_missing");
  }

  return {
    host,
    port,
    secure,
    user,
    pass,
    from,
  };
};

const buildHardcodedConfig = (): SmtpConfig => ({
  host: "51.77.200.108",
  port: 587,
  secure: false,
  user: "noreply",
  pass: "admin",
  from: "noreply@inbtp.net",
});

const useHardcodedDebug = () => parseBoolean(readEnv("MAIL_DEBUG_HARDCODED"), false);

const getConfig = (): SmtpConfig => {
  const hardcoded = useHardcodedDebug();
  const base = hardcoded ? buildHardcodedConfig() : buildEnvConfig();

  // Force STARTTLS mode for this endpoint: port 587 + secure false.
  const config: SmtpConfig = {
    ...base,
    port: 587,
    secure: false,
  };

  console.info("[api/mail/test] SMTP source", hardcoded ? "hardcoded" : "env");

  return config;
};

const createTransporter = (config: SmtpConfig) => {
  console.info("[api/mail/test] SMTP config", {
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.user,
    from: config.from,
  });

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    tls: {
      servername: config.host,
    },
  });
};

const toErrorResponse = (error: unknown) => {
  const smtpError = error as Error & { code?: string };
  const retryableCodes = new Set(["ECONNREFUSED", "ETIMEDOUT", "EHOSTUNREACH", "ENOTFOUND", "ESOCKET"]);

  if (retryableCodes.has(smtpError.code ?? "")) {
    return NextResponse.json(
      {
        ok: false,
        code: "smtp_unreachable",
        message: "SMTP unreachable on MAIL_HOST:587 with STARTTLS. Verify Postfix listen/firewall/network.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json(
    {
      ok: false,
      code: "smtp_test_failed",
      message: error instanceof Error ? error.message : "Mail test failed",
    },
    { status: 500 },
  );
};

const getRecipient = (request: Request) => {
  const url = new URL(request.url);
  return url.searchParams.get("to")?.trim() ?? "";
};

const sendMailTest = async (recipient: string) => {
  const config = getConfig();
  const transporter = createTransporter(config);
  const to = recipient || config.from;

  await transporter.verify();

  const result = await transporter.sendMail({
    from: config.from,
    to,
    subject: "Test SMTP INBTP",
    html: "<p>SMTP test OK (587/STARTTLS)</p>",
  });

  return {
    ok: true,
    transport: {
      host: config.host,
      port: config.port,
      secure: config.secure,
      from: config.from,
    },
    result: {
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
      response: result.response,
    },
  };
};

export async function GET(request: Request) {
  try {
    const payload = await sendMailTest(getRecipient(request));
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api/mail/test] Mail test failed", error);
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { to?: string };
    const payload = await sendMailTest(body.to?.trim() ?? "");
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api/mail/test] Mail test failed", error);
    return toErrorResponse(error);
  }
}
