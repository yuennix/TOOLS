"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResetPasswordBody = exports.SendResetLinksBody = void 0;
const zod_1 = require("zod");
exports.SendResetLinksBody = zod_1.z.object({
    emails: zod_1.z.array(zod_1.z.string()),
});
exports.ResetPasswordBody = zod_1.z.object({
    resetLink: zod_1.z.string(),
    chatId: zod_1.z.string(),
    botToken: zod_1.z.string(),
    customPassword: zod_1.z.string().nullable().optional(),
});
