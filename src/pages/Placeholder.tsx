import { AppLayout } from "@/components/AppLayout";

export default function Placeholder({ title, body }: { title: string; body: string }) {
  return (
    <AppLayout>
      <div className="p-8 max-w-6xl mx-auto">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-1">{body}</p>
      </div>
    </AppLayout>
  );
}
