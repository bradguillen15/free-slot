import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaTo?: string;
  onCtaClick?: () => void;
  className?: string;
};

export function EmptyState({ icon, title, description, ctaLabel, ctaTo, onCtaClick, className }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
      className={cn(
        "flex flex-col items-center text-center gap-3 py-10 px-6 rounded-2xl border border-dashed border-border bg-surface/40",
        className
      )}
    >
      {icon && (
        <div className="h-12 w-12 rounded-2xl gradient-primary flex items-center justify-center shadow-glow text-primary-foreground">
          {icon}
        </div>
      )}
      <div className="space-y-1 max-w-sm">
        <h3 className="font-display text-lg font-semibold tracking-tight">{title}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {ctaLabel && (ctaTo ? (
        <Button asChild size="sm" className="mt-1 gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
          <Link to={ctaTo}>{ctaLabel}</Link>
        </Button>
      ) : (
        <Button size="sm" className="mt-1 gradient-primary text-primary-foreground hover:opacity-90 shadow-glow" onClick={onCtaClick}>
          {ctaLabel}
        </Button>
      ))}
    </motion.div>
  );
}
