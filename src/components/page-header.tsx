export function PageHeader({
  title,
  description,
  nextAction,
}: {
  title: string;
  description?: string;
  nextAction?: string;
}) {
  return (
    <header className="space-y-2 border-b pb-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description && (
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {nextAction && (
        <p className="text-sm text-foreground/80">
          <span className="font-medium">Next:</span> {nextAction}
        </p>
      )}
    </header>
  );
}
