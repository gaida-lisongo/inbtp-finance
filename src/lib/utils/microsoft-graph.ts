import "server-only";

export type Microsoft365Overview = {
  profile: {
    id?: string | null;
    displayName?: string | null;
    userPrincipalName?: string | null;
    mail?: string | null;
    jobTitle?: string | null;
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

const assertMicrosoftConfigured = (): never => {
  const hasAnyMicrosoftEnv =
    Boolean(process.env.MICROSOFT_TENANT_ID) ||
    Boolean(process.env.MICROSOFT_CLIENT_ID) ||
    Boolean(process.env.MICROSOFT_CLIENT_SECRET);

  if (!hasAnyMicrosoftEnv) {
    throw new Error("Microsoft 365 n'est pas configure sur cet environnement.");
  }

  throw new Error("Microsoft 365 est detecte mais l'integration Graph n'est pas encore implementee.");
};

export async function getMicrosoft365Overview(): Promise<Microsoft365Overview> {
  return assertMicrosoftConfigured();
}

export async function createMicrosoft365Channel(_input: {
  teamId: string;
  displayName: string;
  description?: string;
}): Promise<{ channelId: string }> {
  return assertMicrosoftConfigured();
}
