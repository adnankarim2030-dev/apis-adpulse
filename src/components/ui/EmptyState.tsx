export function EmptyState({
  title = "You're all caught up.",
  description,
  icon = "✨",
}: {
  title?: string;
  description?: string;
  icon?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-border bg-surface/50 px-6 py-12 text-center my-4">
      <span className="text-3xl mb-1">{icon}</span>
      <p className="text-base font-semibold text-text">{title}</p>
      {description && <p className="max-w-sm text-sm text-subtle">{description}</p>}
    </div>
  );
}
