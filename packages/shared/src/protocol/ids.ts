import { z } from "zod";

// IDs remain strings on the wire. Branding happens only after Zod has
// validated an external payload, so the runtime representation and protocol
// stay unchanged while package seams can no longer interchange IDs casually.
export const playerIdSchema = z.string().min(1).max(64).brand<"PlayerId">();
export const cardIdSchema = z.string().min(1).max(64).brand<"CardId">();
export const matchIdSchema = z.string().min(1).max(128).brand<"MatchId">();
export const decisionIdSchema = z.string().min(1).max(64).brand<"DecisionId">();
export const clientActionIdSchema = z.string().min(1).max(64).brand<"ClientActionId">();

export type PlayerId = z.infer<typeof playerIdSchema>;
export type CardId = z.infer<typeof cardIdSchema>;
export type MatchId = z.infer<typeof matchIdSchema>;
export type DecisionId = z.infer<typeof decisionIdSchema>;
export type ClientActionId = z.infer<typeof clientActionIdSchema>;
