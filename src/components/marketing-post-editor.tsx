"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bold,
  Check,
  Copy,
  Download,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  generateMarketingImageAction,
  regenerateMarketingPostAction,
  removeMarketingImageAction,
  saveMarketingPostAction,
  setMarketingPostStatusAction,
} from "@/app/actions";
import type { MarketingPost, Product } from "@/types/domain";
import { postImage, postRoleMeta } from "@/lib/marketing-shared";
import {
  applySelectionStyle,
  formatSelectedLines,
  stripUnicodeStyle,
} from "@/lib/linkedin-format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function FormatButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={label} title={label} onClick={onClick}>
      {children}
    </Button>
  );
}

export function MarketingPostEditor({ post, product }: { post: MarketingPost; product: Product }) {
  const router = useRouter();
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(post.title ?? "");
  const [text, setText] = useState(post.formattedText || post.plainText);
  const [imagePrompt, setImagePrompt] = useState(post.imagePrompt ?? "");
  const [instructions, setInstructions] = useState("");
  const [showImprove, setShowImprove] = useState(false);
  const imageUrl = postImage(post);
  const originalText = post.formattedText || post.plainText;
  const dirty =
    title !== (post.title ?? "") ||
    text !== originalText ||
    imagePrompt !== (post.imagePrompt ?? "");
  const meta = postRoleMeta(post.role, product.name);

  const run = (fn: () => Promise<unknown>, success: string) =>
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
        toast.success(success);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Something went wrong");
      }
    });

  const replaceSelection = (
    transform: (value: string, start: number, end: number) => { text: string; start: number; end: number },
  ) => {
    const field = textRef.current;
    if (!field) return;
    const start = field.selectionStart;
    const end = field.selectionEnd;
    if (start === end) {
      toast.message("Select some text first");
      return;
    }
    const next = transform(text, start, end);
    setText(next.text);
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(next.start, next.end);
    });
  };

  const save = () =>
    run(
      () =>
        saveMarketingPostAction(post.id, {
          title,
          plainText: stripUnicodeStyle(text),
          formattedText: text,
          imagePrompt,
          hook: post.hook ?? stripUnicodeStyle(text.split("\n")[0] ?? ""),
        }),
      "Post saved",
    );

  const regenerate = (instruction?: string) => {
    if (
      (post.savedAt || ["ready", "posted"].includes(post.status)) &&
      !confirm("Replace this saved post with a new draft?")
    ) {
      return;
    }
    run(
      () => regenerateMarketingPostAction(post.id, instruction),
      instruction ? "Post revised" : "Post regenerated",
    );
  };

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    toast.success("Formatted post copied");
  };

  return (
    <section className="space-y-4 rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">{title || meta.label}</h3>
        <Badge variant={post.status === "posted" ? "default" : "outline"}>{post.status}</Badge>
        <span className="text-xs text-muted-foreground">{meta.eyebrow}</span>
      </div>

      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Internal title" />

      <div className="overflow-hidden rounded-lg border">
        <div className="flex items-center gap-0.5 border-b bg-muted/35 px-2 py-1">
          <FormatButton label="Bold" onClick={() => replaceSelection((v, s, e) => applySelectionStyle(v, s, e, "bold"))}>
            <Bold className="h-3.5 w-3.5" />
          </FormatButton>
          <FormatButton label="Italic" onClick={() => replaceSelection((v, s, e) => applySelectionStyle(v, s, e, "italic"))}>
            <Italic className="h-3.5 w-3.5" />
          </FormatButton>
          <FormatButton label="Bullets" onClick={() => replaceSelection((v, s, e) => formatSelectedLines(v, s, e, "bullets"))}>
            <List className="h-3.5 w-3.5" />
          </FormatButton>
          <FormatButton label="Numbers" onClick={() => replaceSelection((v, s, e) => formatSelectedLines(v, s, e, "numbers"))}>
            <ListOrdered className="h-3.5 w-3.5" />
          </FormatButton>
          <span className="ml-auto px-2 text-[10px] text-muted-foreground">First line = bold hook</span>
        </div>
        <Textarea
          ref={textRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={16}
          className="min-h-[280px] resize-y rounded-none border-0 text-[15px] leading-7 focus-visible:ring-0"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={pending || !dirty || !text.trim()} onClick={save}>
          <Check className="mr-1.5 h-3.5 w-3.5" />
          Save
        </Button>
        <Button size="sm" variant="outline" disabled={!text.trim()} onClick={copy}>
          <Copy className="mr-1.5 h-3.5 w-3.5" />
          Copy
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => regenerate()}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Regenerate
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setShowImprove((v) => !v)}>
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          Improve
        </Button>
      </div>

      {showImprove && (
        <div className="flex gap-2">
          <Input
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Sharper hook, less jargon…"
            autoFocus
          />
          <Button disabled={pending || !instructions.trim()} onClick={() => regenerate(instructions)}>
            Apply
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t pt-4">
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setMarketingPostStatusAction(post.id, "ready"), "Marked ready")}>
          Ready
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setMarketingPostStatusAction(post.id, "posted"), "Logged as posted")}>
          <Send className="mr-1.5 h-3.5 w-3.5" />
          Posted
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setMarketingPostStatusAction(post.id, "skipped"), "Skipped")}>
          Skip
        </Button>
      </div>

      <div className="grid gap-3 border-t pt-4 lg:grid-cols-[1fr_200px]">
        {imageUrl ? (
          <div className="overflow-hidden rounded-lg border">
            <Image src={imageUrl} alt="" width={400} height={400} unoptimized className="aspect-square w-full object-cover" />
          </div>
        ) : (
          <div className="flex aspect-square items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            No image
          </div>
        )}
        <div className="space-y-2">
          <Textarea value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} rows={4} placeholder="Image prompt" className="text-sm" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={pending || !imagePrompt.trim()} onClick={() => run(() => generateMarketingImageAction(post.id, imagePrompt), "Image generated")}>
              <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
              Generate
            </Button>
            {imageUrl && (
              <>
                <a href={imageUrl} download={`post-${post.id}.png`} className="inline-flex h-8 items-center rounded-md px-2 text-xs hover:bg-muted">
                  <Download className="mr-1 h-3.5 w-3.5" />
                  Download
                </a>
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => removeMarketingImageAction(post.id), "Removed")}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
