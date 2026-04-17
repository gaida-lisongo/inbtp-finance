declare module "unix-crypt-td-js" {
  export default function crypt(key: string, salt: string): string;
}

declare module "nodemailer" {
  export type SendMailAttachment = {
    filename?: string;
    content?: Buffer;
    contentType?: string;
  };

  export type SendMailOptions = {
    from?: string;
    to?: string;
    subject?: string;
    html?: string;
    attachments?: SendMailAttachment[];
  };

  export type SentMessageInfo = {
    messageId: string;
    accepted: string[];
    rejected: string[];
    envelope: unknown;
    response: string;
  };

  export type Transporter = {
    sendMail(options: SendMailOptions): Promise<SentMessageInfo>;
    verify(): Promise<void>;
  };

  export function createTransport(options: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  }): Transporter;

  const nodemailer: {
    createTransport: typeof createTransport;
  };

  export default nodemailer;
}
