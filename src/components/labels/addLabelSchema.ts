import { z } from "zod";
import { hexColor, labelType } from "@/lib/formSchemas";

export const addLabelSchema = z.object({
  name: z.string().trim().min(1),
  color: hexColor,
  type: labelType,
});

export type AddLabelValues = z.infer<typeof addLabelSchema>;
