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

const microsoftGraphBaseUrl = "https://graph.microsoft.com/v1.0";

export const getMicrosoft365AccessToken = async () => {
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
};

const createMicrosoftGraphClient = async () => {
  const accessToken = await getMicrosoft365AccessToken();

  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });
};

export const getMicrosoft365Overview = async (): Promise<Microsoft365Overview> => {
  const graphClient = await createMicrosoftGraphClient();

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

export const getMicrosoft365OverviewUrl = () => `${microsoftGraphBaseUrl}/me`;
