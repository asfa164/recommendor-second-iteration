import crypto from "crypto";
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand
} from "@aws-sdk/client-cognito-identity-provider";
import {
  CognitoIdentityClient,
  GetIdCommand,
  GetCredentialsForIdentityCommand
} from "@aws-sdk/client-cognito-identity";

type CachedCreds = {
  creds: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string;
  } | null;
  expiresAtMs: number | null;
};

const cache: CachedCreds = { creds: null, expiresAtMs: null };

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function getSecretHash(username: string, clientId: string, clientSecret: string): string {
  const message = username + clientId;
  const hmac = crypto.createHmac("sha256", clientSecret);
  hmac.update(message, "utf8");
  return hmac.digest("base64");
}

async function authenticateUser(): Promise<string> {
  const region = env("COGNITO_REGION");
  const username = env("COGNITO_USERNAME");
  const password = env("COGNITO_PASSWORD");
  const clientId = env("COGNITO_CLIENT_ID");
  const clientSecret = env("COGNITO_CLIENT_SECRET");

  const idp = new CognitoIdentityProviderClient({ region });

  const resp = await idp.send(
    new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: clientId,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
        SECRET_HASH: getSecretHash(username, clientId, clientSecret)
      }
    })
  );

  const idToken = resp.AuthenticationResult?.IdToken;
  if (!idToken) throw new Error("Cognito authentication failed: missing IdToken");
  return idToken;
}

export async function getCognitoIdentityPoolCredentials(): Promise<{
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
}> {
  if (cache.creds && cache.expiresAtMs && cache.expiresAtMs > Date.now()) {
    return cache.creds;
  }

  const region = env("COGNITO_REGION");
  const identityPoolId = env("COGNITO_IDENTITY_POOL_ID");
  const userPoolId = env("COGNITO_USER_POOL_ID");

  const idToken = await authenticateUser();

  const providerName = `cognito-idp.${region}.amazonaws.com/${userPoolId}`;

  const identity = new CognitoIdentityClient({ region });

  const getIdResp = await identity.send(
    new GetIdCommand({
      IdentityPoolId: identityPoolId,
      Logins: { [providerName]: idToken }
    })
  );

  const identityId = getIdResp.IdentityId;
  if (!identityId) throw new Error("Failed to get IdentityId from Cognito Identity");

  const credsResp = await identity.send(
    new GetCredentialsForIdentityCommand({
      IdentityId: identityId,
      Logins: { [providerName]: idToken }
    })
  );

  const c = credsResp.Credentials;
  if (!c?.AccessKeyId || !c.SecretKey || !c.SessionToken || !c.Expiration) {
    throw new Error("Failed to obtain AWS credentials from Cognito Identity Pool");
  }

  const expiresAtMs = c.Expiration.getTime() - 2 * 60 * 1000;

  cache.creds = {
    accessKeyId: c.AccessKeyId,
    secretAccessKey: c.SecretKey,
    sessionToken: c.SessionToken
  };
  cache.expiresAtMs = expiresAtMs;

  return cache.creds;
}
