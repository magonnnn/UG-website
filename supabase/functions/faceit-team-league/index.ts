
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    const { faceitId } = await req.json();

    if (
      typeof faceitId !== "string" ||
      !/^[a-f0-9-]{36}$/i.test(faceitId)
    ) {
      return Response.json(
        { error: "A valid FACEIT team ID is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const apiKey = Deno.env.get("FACEIT_API_KEY");

    if (!apiKey) {
      throw new Error("FACEIT_API_KEY secret is not configured");
    }

const url =
  `https://www.faceit.com/api/team-leagues/v1/teams/${encodeURIComponent(faceitId)}/profile/leagues/current`;

const response = await fetch(url, {
  method: "GET",
  headers: {
    Accept: "application/json",
    "User-Agent": "Mozilla/5.0",
    Referer: "https://www.faceit.com/",
  },
});

const body = await response.text();

console.log("FACEIT status:", response.status);
console.log("FACEIT response:", body.slice(0, 1000));

    if (!response.ok) {
      console.error("FACEIT status:", response.status);
      console.error("FACEIT response body:", body);

      return Response.json(
        {
          error: "FACEIT league request failed",
          faceitStatus: response.status,
          details: body.slice(0, 1000),
        },
        { status: 502, headers: corsHeaders }
      );
    }

    return new Response(body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type":
          response.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch (error) {
    console.error("Edge Function error:", error);

    return Response.json(
      { error: "Unable to retrieve FACEIT league data" },
      { status: 500, headers: corsHeaders }
    );
  }
});
