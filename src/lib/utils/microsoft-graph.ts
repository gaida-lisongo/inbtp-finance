import { Client } from "@microsoft/microsoft-graph-client";
import { cookies } from "next/headers";

import { createClient as createServerSupabaseClient } from "@/lib/utils/supabase/server";

export type Microsoft365Overview = {
  profile: {
    displayName: string | null;
    mail: string | null;
    userPrincipalName: string | null;
    jobTitle: string | null;
  };
  messages: Array<{
    id: string;
    subject: string | null;
    from: string | null;
    receivedDateTime: string | null;
  }>;
  events: Array<{
    id: string;
    subject: string | null;
    start: string | null;
    end: string | null;
  }>;
  files: Array<{
    id: string;
    name: string | null;
    webUrl: string | null;
    lastModifiedDateTime: string | null;
  }>;
};

type SendMicrosoft365MailInput = {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
};

type TokenCache = {
  accessToken: string;
  expiresAt: number;
} | null;

const microsoftGraphBaseUrl = "https://graph.microsoft.com/v1.0";
const entraTenantId = process.env.ENTRA_TENANT_ID;
const entraClientId = process.env.ENTRA_CLIENT_ID;
const entraClientSecret = process.env.ENTRA_CLIENT_SECRET;
const entraDefaultDomain = process.env.ENTRA_DEFAULT_DOMAIN;
const controlMailAddress = process.env.CONTROL_MAIL;

const createGraphClient = (accessToken: string) =>
  Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });

class MicrosoftGraphService {
  private static instance: MicrosoftGraphService | null = null;

  private appTokenCache: TokenCache = null;

  private constructor() {}

  static getInstance() {
    if (!MicrosoftGraphService.instance) {
      MicrosoftGraphService.instance = new MicrosoftGraphService();
    }

    return MicrosoftGraphService.instance;
  }

  private assertAppCredentials() {
    if (!entraTenantId || !entraClientId || !entraClientSecret) {
      throw new Error("missing_entra_app_credentials");
    }
  }

  async getDelegatedAccessToken() {
    const cookieStore = await cookies();
    const supabase = createServerSupabaseClient(cookieStore);
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      throw new Error(error.message);
    }

    const providerToken = data.session?.provider_token;

    if (!providerToken) {
      throw new Error(
        "Le token Microsoft 365 est absent de la session. Reconnectez-vous pour accorder les nouveaux scopes Graph.",
      );
    }

    return providerToken;
  }

  async getDelegatedClient() {
    const accessToken = await this.getDelegatedAccessToken();
    return createGraphClient(accessToken);
  }

  private async fetchAppAccessToken() {
    this.assertAppCredentials();

    if (this.appTokenCache && Date.now() < this.appTokenCache.expiresAt - 60_000) {
      return this.appTokenCache.accessToken;
    }

    const tokenUrl = `https://login.microsoftonline.com/${entraTenantId}/oauth2/v2.0/token`;
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: entraClientId!,
        client_secret: entraClientSecret!,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`graph_app_token_failed:${response.status}:${errorText}`);
    }

    const payload = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };

    if (!payload.access_token) {
      throw new Error("graph_app_token_missing");
    }

    this.appTokenCache = {
      accessToken: payload.access_token,
      expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000,
    };

    return payload.access_token;
  }

  async getAppClient() {
    const accessToken = await this.fetchAppAccessToken();
    return createGraphClient(accessToken);
  }

  private getDefaultSenderAddress() {
    if (controlMailAddress) {
      return controlMailAddress;
    }

    if (entraDefaultDomain) {
      return `no-reply@${entraDefaultDomain}`;
    }

    throw new Error("graph_mail_sender_not_configured");
  }

  async sendMail({ to, subject, html, from }: SendMicrosoft365MailInput) {
    const graphClient = await this.getAppClient();
    const recipients = Array.isArray(to) ? to : [to];
    const senderAddress = from ?? this.getDefaultSenderAddress();

    await graphClient.api(`/users/${encodeURIComponent(senderAddress)}/sendMail`).post({
      message: {
        subject,
        body: {
          contentType: "HTML",
          content: html,
        },
        toRecipients: recipients.map((address) => ({
          emailAddress: {
            address,
          },
        })),
      },
      saveToSentItems: true,
    });
  }
}

export const microsoftGraphService = MicrosoftGraphService.getInstance();

export const getMicrosoft365Overview = async (): Promise<Microsoft365Overview> => {
  const graphClient = await microsoftGraphService.getDelegatedClient();

  const [profile, messagesResponse, eventsResponse, filesResponse] = await Promise.all([
    graphClient.api("/me").select("displayName,mail,userPrincipalName,jobTitle").get(),
    graphClient
      .api("/me/messages")
      .top(5)
      .select("id,subject,from,receivedDateTime")
      .orderby("receivedDateTime DESC")
      .get(),
    graphClient
      .api("/me/events")
      .top(5)
      .select("id,subject,start,end")
      .orderby("start/dateTime ASC")
      .get(),
    graphClient
      .api("/me/drive/root/children")
      .top(5)
      .select("id,name,webUrl,lastModifiedDateTime")
      .orderby("lastModifiedDateTime DESC")
      .get(),
  ]);

  return {
    profile: {
      displayName: profile.displayName ?? null,
      mail: profile.mail ?? null,
      userPrincipalName: profile.userPrincipalName ?? null,
      jobTitle: profile.jobTitle ?? null,
    },
    messages: (messagesResponse.value ?? []).map(
      (message: {
        id: string;
        subject?: string;
        from?: { emailAddress?: { address?: string } };
        receivedDateTime?: string;
      }) => ({
        id: message.id,
        subject: message.subject ?? null,
        from: message.from?.emailAddress?.address ?? null,
        receivedDateTime: message.receivedDateTime ?? null,
      }),
    ),
    events: (eventsResponse.value ?? []).map(
      (event: {
        id: string;
        subject?: string;
        start?: { dateTime?: string };
        end?: { dateTime?: string };
      }) => ({
        id: event.id,
        subject: event.subject ?? null,
        start: event.start?.dateTime ?? null,
        end: event.end?.dateTime ?? null,
      }),
    ),
    files: (filesResponse.value ?? []).map(
      (file: {
        id: string;
        name?: string;
        webUrl?: string;
        lastModifiedDateTime?: string;
      }) => ({
        id: file.id,
        name: file.name ?? null,
        webUrl: file.webUrl ?? null,
        lastModifiedDateTime: file.lastModifiedDateTime ?? null,
      }),
    ),
  };
};

export const sendMicrosoft365Mail = async (input: SendMicrosoft365MailInput) => {
  await microsoftGraphService.sendMail(input);
};

export const getMicrosoft365OverviewUrl = () => `${microsoftGraphBaseUrl}/me`;
