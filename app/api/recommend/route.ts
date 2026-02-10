import { NextResponse } from "next/server";
import { CompositeObjectiveSchema } from "../../../lib/schema";
import { callBedrock } from "../../../lib/bedrock";
import { deepClean } from "../../../lib/clean";

export const runtime = "nodejs"; // required for AWS SDK on Vercel

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Parse and validate the incoming JSON payload (applies defaults)
    const validated = CompositeObjectiveSchema.parse(body);

    // Strip empty optionals / undefined / empty strings/objects/arrays
    const cleaned = deepClean(validated);

    // Call Bedrock via Cognito (USER_PASSWORD_AUTH + Identity Pool creds)
    const output = await callBedrock({ inputJson: cleaned });

    // Return the model's JSON output directly to the client
    return NextResponse.json(output);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 400 }
    );
  }
}
