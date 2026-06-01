import { z } from "zod";

export const SendResetLinksBody = z.object({
  emails: z.array(z.string()),
});

export const ResetPasswordBody = z.object({
  resetLinks: z.array(z.string()),
  chatId: z.string(),
  botToken: z.string(),
  customPassword: z.string().nullable().optional(),
});

export type SendResetLinksBodyType = z.infer<typeof SendResetLinksBody>;
export type ResetPasswordBodyType = z.infer<typeof ResetPasswordBody>;
