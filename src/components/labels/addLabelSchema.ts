import { z } from "zod";
import type { TFunction } from "i18next";
import { hexColor, labelType } from "@/lib/formSchemas";

export const addLabelSchema = (t: TFunction) => z.object({
  name: z.string().trim().min(1, t("validation.nameRequired")),
  color: hexColor(t),
  type: labelType,
});

export type AddLabelValues = z.infer<ReturnType<typeof addLabelSchema>>;
