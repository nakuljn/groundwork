import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { generateMarketingPostImage } from "@/lib/marketing-images";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { postId?: number; prompt?: string };
    const postId = body.postId;
    if (!postId || !Number.isFinite(postId)) {
      return NextResponse.json({ error: "postId is required" }, { status: 400 });
    }

    const filename = await generateMarketingPostImage(postId, body.prompt);
    revalidatePath("/marketing");
    return NextResponse.json({ filename });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
