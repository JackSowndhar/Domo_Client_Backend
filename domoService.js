import axios from "axios";

async function getDomoAccessToken() {
  const auth = Buffer.from(
    `${process.env.DOMO_CLIENT_ID}:${process.env.DOMO_CLIENT_SECRET}`
  ).toString("base64");

  const response = await axios.get(
    "https://api.domo.com/oauth/token?grant_type=client_credentials&scope=dashboard",
    {
      headers: { Authorization: `Basic ${auth}` },
    }
  );
  return response.data.access_token;
}

export async function getEmbedToken(embedId, pdpRules) {
  const accessToken = await getDomoAccessToken();

  const response = await axios.post(
    "https://api.domo.com/v1/stories/embed/auth",
    {
      sessionLength: 1440,
      authorizations: [
        {
          token: embedId,
          entity: "PAGE",
          permissions: ["READ"],
          filters: pdpRules.map((r) => ({
            column: r.column,
            operator: r.operator.replace(/ /g, "_"),
            values: r.values,
          })),
        },
      ],
    },
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  return response.data.authentication;
}