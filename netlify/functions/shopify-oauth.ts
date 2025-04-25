import type { Handler } from "@netlify/functions";
import fetch from "node-fetch";

const client_id = process.env.VITE_SHOPIFY_CLIENT_ID as string;
const client_secret = process.env.VITE_SHOPIFY_CLIENT_SECRET as string;

// Simulated `genState` (you should replace this with secure logic)
const genState = "someSavedStateValue";

export const handler: Handler = async (event, _context) => {
  const params = event.queryStringParameters;

  const code = params?.code;
  const shop = params?.shop;
  const hmac = params?.hmac;
  const state = params?.state;
  const timestamp = params?.timestamp;

  console.debug("OAuth Callback Params:", { code, shop, hmac, state, timestamp });

  if (!code || !shop || !state || !hmac) {
    return {
      statusCode: 400,
      body: JSON.stringify("Missing required query parameters."),
    };
  }

  console.log(`Client Id: ${client_id}`);
  console.log(`Client Secret: ${client_secret}`);

  // TODO: verify the state variable with the one previously generated
  // if (!genState || state !== genState) {
  //   console.log("Failed to authenticate: state mismatch");
  //   return {
  //     statusCode: 403,
  //     body: JSON.stringify("Invalid state parameter."),
  //   };
  // }

  // TODO: verify the HMAC

  try {
    const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id,
        client_secret,
        code,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to get access token:", errorText);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'text/html',
        },
        body: errorText,
      };
    }

    const tokenData = await response.json();

    // TODO: DO NOT log token data like this in production 
    console.log("Token Data:", tokenData);

    // TODO: Save tokenData.access_token securely for future API calls

    return {
      statusCode: 200,
      body: JSON.stringify("App successfully installed!"),
    };
  } catch (err: any) {
    console.error("Error during token exchange:", err);
    return {
      statusCode: 500,
      body: JSON.stringify("Internal server error"),
    };
  }
};
