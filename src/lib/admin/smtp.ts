import { connect as tlsConnect, type TLSSocket } from "node:tls";
import { connect as netConnect, type Socket } from "node:net";

export type SmtpTransport = { port: 465 | 587; mode: "implicit-tls" | "starttls" };

export const SMTP_HOST = "smtp.gmail.com";
export const SMTP_TRANSPORTS: readonly SmtpTransport[] = [
  { port: 465, mode: "implicit-tls" },
  { port: 587, mode: "starttls" },
] as const;

const SMTP_TIMEOUT_MS = 15_000;

export class SmtpError extends Error {
  readonly phase: "connect" | "tls" | "session";
  constructor(message: string, phase: "connect" | "tls" | "session", cause?: unknown) {
    super(message);
    this.name = "SmtpError";
    this.phase = phase;
    if (cause !== undefined) (this as Error & { cause?: unknown }).cause = cause;
  }
}

export function isSmtpConnectOrTlsFailure(err: unknown): boolean {
  if (err instanceof SmtpError) return err.phase === "connect" || err.phase === "tls";
  if (!err || typeof err !== "object") {
    return typeof err === "string" && isTlsFailureMessage(err);
  }
  const e = err as { code?: string; message?: string; name?: string };
  const code = String(e.code || "");
  const msg = `${e.name || ""} ${e.message || ""}`;
  const retryCodes = new Set([
    "ECONNREFUSED",
    "ETIMEDOUT",
    "ENETUNREACH",
    "EHOSTUNREACH",
    "ECONNRESET",
    "EPIPE",
    "ENOTFOUND",
    "EAI_AGAIN",
    "ECONNABORTED",
    "ERR_SOCKET_CLOSED",
    "UND_ERR_CONNECT_TIMEOUT",
    "EPROTO",
  ]);
  if (retryCodes.has(code)) return true;
  if (code.startsWith("ERR_SSL") || code.startsWith("ERR_TLS") || /^(ERR_)?SSL/.test(code)) return true;
  return isTlsFailureMessage(`${code} ${msg}`);
}

function isTlsFailureMessage(msg: string): boolean {
  return (
    /before secure TLS connection was established/i.test(msg) ||
    /Client network socket disconnected/i.test(msg) ||
    /UNEXPECTED_EOF/i.test(msg) ||
    /ssl[ _]error/i.test(msg) ||
    /CERT_|UNABLE_TO_VERIFY|EPROTO|handshake/i.test(msg)
  );
}

type MailPayload = { to: string; subject: string; html: string; text: string };

type SendWithTransport = (opts: MailPayload, transport: SmtpTransport) => Promise<void>;

export type SmtpSendDeps = { sendWithTransport?: SendWithTransport };

export async function sendSmtp(opts: MailPayload, deps?: SmtpSendDeps): Promise<{ transport: SmtpTransport }> {
  const send = deps?.sendWithTransport ?? sendWithTransport;
  let last: unknown;
  for (const transport of SMTP_TRANSPORTS) {
    try {
      await send(opts, transport);
      return { transport };
    } catch (err) {
      last = err;
      const canFallback = transport.port === 465 && isSmtpConnectOrTlsFailure(err);
      if (!canFallback) throw err;
    }
  }
  throw last instanceof Error ? last : new SmtpError(String(last), "connect");
}

async function sendWithTransport(opts: MailPayload, transport: SmtpTransport): Promise<void> {
  const host = SMTP_HOST;
  // Attach I/O before the connect/TLS callback so the 220 greeting cannot be missed.
  const opened = await openSocket(host, transport.port, transport.mode === "implicit-tls", transport.mode === "implicit-tls" ? "tls" : "connect");
  let socket: Socket | TLSSocket = opened.socket;
  let io = opened.io;
  try {
    await expectCode(io, 220, "session");
    await command(io, "EHLO hezi-orkor", 250, "session");
    if (transport.mode === "starttls") {
      await command(io, "STARTTLS", 220, "tls");
      io.detach();
      const upgraded = await upgradeToTls(socket, host);
      socket = upgraded.socket;
      io = upgraded.io;
      await command(io, "EHLO hezi-orkor", 250, "session");
    }
    await sendAuthenticatedMessage(io, opts);
    try {
      io.write("QUIT");
    } catch {
      /* ignore */
    }
    socket.end();
  } catch (err) {
    socket.destroy();
    throw err;
  }
}

function openSocket(
  host: string,
  port: number,
  implicitTls: boolean,
  phase: "connect" | "tls",
): Promise<{ socket: Socket | TLSSocket; io: SmtpIo }> {
  return new Promise((resolve, reject) => {
    const sock: Socket | TLSSocket = implicitTls
      ? tlsConnect({ host, port, servername: host })
      : netConnect({ host, port });
    const io = attachIo(sock);
    const timer = setTimeout(() => {
      sock.destroy();
      reject(new SmtpError("SMTP timeout", phase));
    }, SMTP_TIMEOUT_MS);
    const finish = () => {
      clearTimeout(timer);
      sock.setTimeout(SMTP_TIMEOUT_MS);
      resolve({ socket: sock, io });
    };
    sock.once(implicitTls ? "secureConnect" : "connect", finish);
    sock.once("error", (err) => {
      clearTimeout(timer);
      sock.destroy();
      reject(wrapSocketError(err, phase));
    });
  });
}

function upgradeToTls(socket: Socket, host: string): Promise<{ socket: TLSSocket; io: SmtpIo }> {
  return new Promise((resolve, reject) => {
    const secure = tlsConnect({ socket, host, servername: host });
    const io = attachIo(secure);
    const timer = setTimeout(() => {
      secure.destroy();
      reject(new SmtpError("SMTP STARTTLS timeout", "tls"));
    }, SMTP_TIMEOUT_MS);
    secure.once("secureConnect", () => {
      clearTimeout(timer);
      secure.setTimeout(SMTP_TIMEOUT_MS);
      resolve({ socket: secure, io });
    });
    secure.once("error", (err) => {
      clearTimeout(timer);
      secure.destroy();
      reject(wrapSocketError(err, "tls"));
    });
  });
}

function wrapSocketError(err: unknown, phase: "connect" | "tls"): SmtpError {
  const message = err instanceof Error ? err.message : String(err);
  const nextPhase = isTlsFailureMessage(message) ? "tls" : phase;
  return new SmtpError(message, nextPhase, err);
}

type SmtpIo = {
  write: (cmd: string) => void;
  readReply: () => Promise<{ code: number; text: string }>;
  detach: () => void;
};

function attachIo(socket: Socket | TLSSocket): SmtpIo {
  let buf = "";
  const queued: string[] = [];
  const waiters: Array<(line: string) => void> = [];
  const onData = (chunk: Buffer) => {
    buf += chunk.toString("utf8");
    let idx = buf.indexOf("\n");
    while (idx >= 0) {
      const line = buf.slice(0, idx).replace(/\r$/, "");
      buf = buf.slice(idx + 1);
      const w = waiters.shift();
      if (w) w(line);
      else queued.push(line);
      idx = buf.indexOf("\n");
    }
  };
  const onError = (err: Error) => {
    const fail = new SmtpError(err.message, "session", err);
    while (waiters.length) {
      /* reject by throwing on next read via a failed line — destroy path */
    }
    socket.destroy();
    void fail;
  };
  socket.on("data", onData);
  socket.on("error", onError);
  function nextLine(): Promise<string> {
    if (queued.length) return Promise.resolve(queued.shift() as string);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new SmtpError("SMTP timeout", "session")), SMTP_TIMEOUT_MS);
      waiters.push((line) => {
        clearTimeout(timer);
        resolve(line);
      });
    });
  }
  async function readReply() {
    const lines: string[] = [];
    let line = await nextLine();
    lines.push(line);
    while (/^\d{3}-/.test(line)) {
      line = await nextLine();
      lines.push(line);
    }
    const last = lines[lines.length - 1] || "";
    return { code: Number(last.slice(0, 3)) || 0, text: lines.join("\n") };
  }
  return {
    write: (cmd: string) => {
      socket.write(`${cmd}\r\n`);
    },
    readReply,
    detach: () => {
      socket.off("data", onData);
      socket.off("error", onError);
    },
  };
}

async function expectCode(io: SmtpIo, expected: number, phase: "connect" | "tls" | "session") {
  const reply = await io.readReply();
  if (reply.code !== expected) {
    throw new SmtpError(`SMTP ${reply.code}: ${stripSecrets(reply.text)}`, phase);
  }
  return reply;
}

async function command(io: SmtpIo, cmd: string, expected: number, phase: "connect" | "tls" | "session") {
  io.write(cmd);
  return expectCode(io, expected, phase);
}

function stripSecrets(text: string) {
  return text.replace(/[A-Za-z0-9+/]{20,}={0,2}/g, "[redacted]");
}

async function sendAuthenticatedMessage(io: SmtpIo, opts: MailPayload) {
  const user = process.env.GMAIL_USER!;
  const pass = process.env.GMAIL_APP_PASSWORD!;
  await command(io, "AUTH LOGIN", 334, "session");
  await command(io, Buffer.from(user).toString("base64"), 334, "session");
  await command(io, Buffer.from(pass).toString("base64"), 235, "session");
  await command(io, `MAIL FROM:<${user}>`, 250, "session");
  await command(io, `RCPT TO:<${opts.to}>`, 250, "session");
  await command(io, "DATA", 354, "session");
  const subject = `=?UTF-8?B?${Buffer.from(opts.subject).toString("base64")}?=`;
  const payload =
    `From: חזי אורקור ניהול <${user}>\r\n` +
    `To: ${opts.to}\r\n` +
    `Subject: ${subject}\r\n` +
    `MIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n` +
    opts.html +
    "\r\n.";
  io.write(payload);
  await expectCode(io, 250, "session");
}
