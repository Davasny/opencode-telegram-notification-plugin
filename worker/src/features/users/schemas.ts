import { z } from "zod";

export const userDataSchema = z.object({
  chatId: z.number(),
  firstName: z.string().optional(),
});

export type UserData = z.infer<typeof userDataSchema>;
