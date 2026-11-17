import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-eco">{eyebrow}</p>}
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">{title}</h1>
        {description && <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, description, children, actions, className = "" }: { title?: string; description?: ReactNode; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border bg-card p-5 shadow-card md:p-6 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-base font-semibold text-foreground">{title}</h2>}
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function LoadingBlock({ label = "Loading saved samples…" }: { label?: string }) {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed bg-card/60 text-sm text-muted-foreground">
      <span className="mr-2 size-3 animate-ping rounded-full bg-primary/60" />
      {label}
    </div>
  );
}

export function DemoNotice() {
  return (
    <div className="rounded-lg border border-dashed border-primary/30 bg-secondary/70 px-4 py-3 text-sm text-secondary-foreground">
      <strong className="font-semibold">Demonstration data:</strong> samples marked “Demo data” are synthetic values created for
      illustration. They are not real laboratory results or live sensor readings, and the sites are fictional.
    </div>
  );
}
