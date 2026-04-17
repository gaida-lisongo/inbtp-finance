import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import crypt from "unix-crypt-td-js";
import fs from "fs";

const getDb = () =>
  mysql.createConnection({
    host: process.env.DB_HOST ?? "localhost",
    user: process.env.DB_USER ?? "mailuser",
    password: process.env.DB_SECRET ?? "admin",
    database: process.env.DB_NAME ?? "mailserver",
  });

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const db = await getDb();

  // hash compatible Dovecot
  const hash = crypt(password, "$6$randomsalt");

  const maildir = `/var/mail/vhosts/inbtp.net/${email}/`;

  // insert DB
  await db.execute(
    "INSERT INTO users (email, password, maildir) VALUES (?, ?, ?)",
    [email, hash, maildir]
  );

  // créer dossier mail
  fs.mkdirSync(maildir, { recursive: true });

  return NextResponse.json({ status: "created" });
}

export async function GET() {
  const db = await getDb();
  const [rows] = await db.execute("SELECT * FROM users");
  return NextResponse.json(rows);
}

export async function DELETE(req: Request) {
  const { email } = await req.json();
  const db = await getDb();

  await db.execute("DELETE FROM users WHERE email = ?", [email]);

  return NextResponse.json({ deleted: true });
}

export async function PUT(req: Request) {
  const { email, password } = await req.json();
  const db = await getDb();

  const hash = crypt(password, "$6$randomsalt");

  await db.execute(
    "UPDATE users SET password=? WHERE email=?",
    [hash, email]
  );

  return NextResponse.json({ updated: true });
}
