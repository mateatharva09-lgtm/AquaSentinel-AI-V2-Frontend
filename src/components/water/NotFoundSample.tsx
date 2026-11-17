import { Link } from "@tanstack/react-router";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotFoundSample() {
  return (
    <div className="mx-auto max-w-md rounded-xl border bg-card p-10 text-center shadow-card">
      <SearchX className="mx-auto size-10 text-muted-foreground" />
      <h1 className="mt-4 text-xl font-semibold">Sample not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">It may have been deleted, or it was saved in a different browser.</p>
      <div className="mt-6 flex justify-center gap-2">
        <Button asChild><Link to="/history">Go to history</Link></Button>
        <Button asChild variant="outline"><Link to="/analysis">New analysis</Link></Button>
      </div>
    </div>
  );
}
