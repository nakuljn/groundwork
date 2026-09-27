"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Copy, Pencil, RefreshCw, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import {
  generateCategoryMessages,
  regenerateCategoryTemplate,
  saveCategoryTemplate,
} from "@/app/actions";
import type { OutreachCategory } from "@/types/domain";
import {
  LIMITS,
  TEMPLATE_KINDS,
  linkedinTemplateKinds,
  savedCountForChannel,
  type TemplateKind,
} from "@/lib/outreach";
import type { Blueprint } from "@/lib/blueprint/schema";
import { categoryHasLinkedInDraft, isFirmGroup, savedFieldsOf } from "@/lib/categories";
import { fillTemplatePlaceholders } from "@/lib/firm-name";
import { SalesNavigatorGuide } from "@/components/sales-navigator-guide";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const LINKEDIN_KINDS = linkedinTemplateKinds();
const LINKEDIN_TOTAL = LINKEDIN_KINDS.length;

function preview(text: string, max = 72) {
  const line = text.replace(/\s+/g, " ").trim();
  if (line.length <= max) return line;
  return `${line.slice(0, max)}…`;
}

function TemplatePanel({
  category,
  kind,
  saved,
  defaultOpen,
  previewName = "",
  previewOrg = "",
  sharedPreview = false,
  blueprint,
}: {
  category: OutreachCategory;
  kind: TemplateKind;
  saved: boolean;
  defaultOpen?: boolean;
  previewName?: string;
  previewOrg?: string;
  sharedPreview?: boolean;
  blueprint: Blueprint;
}) {
  const router = useRouter();
  const spec = TEMPLATE_KINDS.find((t) => t.kind === kind)!;
  const original = category[spec.field] ?? "";
  const [open, setOpen] = useState(defaultOpen ?? false);
  const [value, setValue] = useState(original);
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [improving, setImproving] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [pending, startTransition] = useTransition();
  const dirty = value !== original;
  const effectiveName = sharedPreview ? previewName : name;
  const effectiveOrg = sharedPreview ? previewOrg : org;
  const filled = fillTemplatePlaceholders(value, effectiveName, effectiveOrg);
  const noteLength = kind === "linkedin" ? filled.length : null;

  useEffect(() => {
    setValue(original);
  }, [original]);

  const run = (fn: () => Promise<unknown>, success: string, keepOpen = false) =>
    startTransition(async () => {
      try {
        await fn();
        if (keepOpen) setOpen(true);
        router.refresh();
        toast.success(success);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Something went wrong");
      }
    });

  const copy = async () => {
    await navigator.clipboard.writeText(filled);
    toast.success("Copied");
  };

  const save = () => {
    if (!value.trim()) {
      toast.error("Message is empty");
      return;
    }
    run(() => saveCategoryTemplate(category.id, kind, value), "Saved — kept next time you redraft", true);
  };

  const regenerate = (withInstructions?: string) => {
    if (saved && !confirm(`Replace your saved ${spec.label.toLowerCase()}?`)) return;
    startTransition(async () => {
      try {
        const next = await regenerateCategoryTemplate(category.id, kind, withInstructions);
        setValue(typeof next === "string" ? next : original);
        setOpen(true);
        setInstructions("");
        setImproving(false);
        router.refresh();
        toast.success(withInstructions ? "Updated" : "Regenerated");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Something went wrong");
      }
    });
  };

  return (
    <details
      className="group/msg rounded-lg border bg-background"
      open={open}
      onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{spec.label}</span>
            {saved && !dirty ? (
              <Badge variant="secondary" className="text-[10px]">
                Saved
              </Badge>
            ) : dirty ? (
              <Badge variant="outline" className="text-[10px]">
                Edited
              </Badge>
            ) : original ? (
              <Badge variant="outline" className="text-[10px]">
                Draft
              </Badge>
            ) : null}
            {noteLength !== null && (
              <span
                className={`text-[10px] tabular-nums ${
                  noteLength > LIMITS.note ? "text-destructive" : "text-foreground/50"
                }`}
              >
                {noteLength}/{LIMITS.note}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-foreground/60">{spec.when}</p>
          {original && (
            <p className="mt-1 truncate text-xs text-foreground/40">{preview(original)}</p>
          )}
        </div>
        <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-foreground/50 transition-transform group-open/msg:rotate-180" />
      </summary>

      <div className="space-y-3 border-t px-4 py-4">
        {!original ? (
          <div className="flex flex-wrap items-center gap-2 text-sm text-foreground/70">
            <span>Not written yet.</span>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => regenerate()}>
              {pending ? "Writing…" : "Write with AI"}
            </Button>
          </div>
        ) : (
          <>
            <Textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={Math.min(22, Math.max(6, value.split("\n").length + 2))}
              className="min-h-[120px] resize-y font-[inherit] text-sm leading-relaxed"
              placeholder="Edit the message here…"
            />

            <p className="text-xs text-foreground/60">
              Edit directly, then Save. Saved messages stay as you wrote them when you redraft the
              rest.
            </p>

            {!sharedPreview && (
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Their first name → fills {name}"
                  className="h-8 text-sm"
                />
                {isFirmGroup(blueprint, category.key) && (
                  <Input
                    value={org}
                    onChange={(e) => setOrg(e.target.value)}
                    placeholder={`Their ${blueprint.vocabulary.org} → fills {org}`}
                    className="h-8 text-sm"
                  />
                )}
              </div>
            )}
            {sharedPreview && (effectiveName || effectiveOrg) && (
              <p className="text-xs text-muted-foreground">
                Copy uses the target firm settings above
                {effectiveName ? ` · {name} → ${effectiveName}` : ""}
                {effectiveOrg ? ` · {org} → ${effectiveOrg}` : ""}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={save} disabled={pending || !dirty}>
                <Check className="mr-1 h-3.5 w-3.5" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={copy}>
                <Copy className="mr-1 h-3.5 w-3.5" />
                Copy
              </Button>
              {dirty && (
                <Button size="sm" variant="ghost" onClick={() => setValue(original)}>
                  Revert
                </Button>
              )}
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => regenerate()}>
                <RefreshCw className="mr-1 h-3.5 w-3.5" />
                Regenerate
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setImproving((v) => !v)}>
                {improving ? (
                  <X className="mr-1 h-3.5 w-3.5" />
                ) : (
                  <Pencil className="mr-1 h-3.5 w-3.5" />
                )}
                Improve with AI
              </Button>
            </div>

            {improving && (
              <div className="flex gap-2">
                <Input
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Shorter, more formal, mention translation first…"
                  className="h-8 text-sm"
                  autoFocus
                  onKeyDown={(e) =>
                    e.key === "Enter" && instructions.trim() && regenerate(instructions)
                  }
                />
                <Button
                  size="sm"
                  disabled={pending || !instructions.trim()}
                  onClick={() => regenerate(instructions)}
                >
                  {pending ? "…" : "Apply"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </details>
  );
}

export function CategoryMessagesPanel({
  category,
  step,
  previewName,
  previewOrg,
  sharedPreview = false,
  blueprint,
}: {
  category: OutreachCategory;
  step?: number;
  previewName?: string;
  previewOrg?: string;
  sharedPreview?: boolean;
  blueprint: Blueprint;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const hasDraft = categoryHasLinkedInDraft(category);
  const saved = savedFieldsOf(category);
  const linkedinSaved = savedCountForChannel(saved, "linkedin");
  const unsavedCount = LINKEDIN_TOTAL - linkedinSaved;

  const draftAll = () => {
    if (hasDraft && !confirm(`Redraft the ${unsavedCount} unsaved LinkedIn templates? Saved ones stay as they are.`)) {
      return;
    }
    startTransition(async () => {
      try {
        await generateCategoryMessages(category.id);
        setOpen(true);
        router.refresh();
        toast.success(`${category.name} LinkedIn messages drafted`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed");
      }
    });
  };

  return (
    <details
      className="group rounded-xl border bg-card"
      open={open}
      onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {step !== undefined && (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] tabular-nums text-foreground/70">
                {step}
              </span>
            )}
            <h3 className="font-semibold">{category.name}</h3>
            {hasDraft && (
              <Badge variant="outline">
                {linkedinSaved}/{LINKEDIN_TOTAL} saved
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-sm text-foreground/70">{category.description}</p>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-foreground/50 transition-transform group-open:rotate-180" />
      </summary>

      <div className="space-y-4 border-t px-5 py-5">
        <details className="group/nav rounded-lg border">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium">
            What to select in Sales Navigator
            <ChevronDown className="h-4 w-4 text-foreground/50 transition-transform group-open/nav:rotate-180" />
          </summary>
          <div className="border-t px-4 py-4">
            <SalesNavigatorGuide categoryKey={category.key} blueprint={blueprint} />
          </div>
        </details>

        {!hasDraft ? (
          <div className="space-y-2">
            <p className="text-sm text-foreground/70">
              Draft all four LinkedIn messages, then open each one below to edit and save the ones
              you like.
            </p>
            <Button disabled={pending} onClick={draftAll}>
              <Sparkles className="mr-1.5 h-4 w-4" />
              {pending ? "Drafting…" : "Draft LinkedIn messages"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {unsavedCount > 0 && (
              <div className="flex justify-end">
                <Button size="sm" variant="outline" disabled={pending} onClick={draftAll}>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  {pending ? "Drafting…" : `Redraft ${unsavedCount} unsaved`}
                </Button>
              </div>
            )}

            <div className="space-y-2">
              {LINKEDIN_KINDS.map((t, i) => (
                <TemplatePanel
                  key={`${category.id}-${t.kind}`}
                  category={category}
                  kind={t.kind}
                  saved={saved.includes(t.field)}
                  defaultOpen={i === 0}
                  previewName={previewName}
                  previewOrg={previewOrg}
                      sharedPreview={sharedPreview}
                      blueprint={blueprint}
                    />
              ))}
            </div>
          </div>
        )}
      </div>
    </details>
  );
}
