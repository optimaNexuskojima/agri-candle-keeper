import { useState } from "react";
import { Sprout } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { GoodFormDialog } from "@/components/agri/GoodFormDialog";
import { buildSampleData } from "@/lib/agri/sample";
import { replaceAll } from "@/lib/agri/store";

export function EmptyGoods() {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="ios-card mx-auto max-w-md px-6 py-10 text-center">
      <div className="bg-primary/10 text-primary mx-auto flex size-14 items-center justify-center rounded-2xl">
        <Sprout className="size-7" />
      </div>
      <h2 className="mt-4 text-xl font-bold">Welcome to AgriCandle</h2>
      <p className="text-muted-foreground mt-2 text-sm">
        Track daily prices for beans, pulses, sesame, maize and more. Everything stays on this
        device and works offline.
      </p>
      <div className="mt-6 space-y-2">
        <Button className="h-12 w-full" onClick={() => setFormOpen(true)}>
          Add First Good
        </Button>
        <Button
          variant="outline"
          className="h-12 w-full"
          onClick={() => {
            replaceAll(buildSampleData());
            toast.success("Sample data loaded");
          }}
        >
          Load Sample Data
        </Button>
      </div>
      <GoodFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}