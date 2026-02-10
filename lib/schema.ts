import { z } from "zod";

export const TurnMatchingSchema = z
  .object({
    scope: z.enum(["any", "recent", "current"]).default("any"),
    evaluationStrategy: z
      .enum(["first_match", "best_match", "latest_match"])
      .default("first_match"),
    recentTurnCount: z.number().int().positive().optional()
  })
  .superRefine((val, ctx) => {
    if (val.scope === "recent" && (val.recentTurnCount == null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "recentTurnCount is required when scope='recent'",
        path: ["recentTurnCount"]
      });
    }
  });

export const SubObjectiveSchema = z.object({
  description: z.string().min(1),
  isBlocking: z.boolean().default(false),
  instructions: z.string().optional(),
  satisfactionCriteria: z.array(z.string().min(1)).optional(),
  maxTurnsForObjective: z.number().int().positive().default(12),
  turnMatching: TurnMatchingSchema.optional()
});

export const CompositeObjectiveSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  persona: z.string().min(1),
  userVariables: z.record(z.string()).optional(),
  subObjectives: z.array(SubObjectiveSchema).min(1)
});

export type CompositeObjectiveInput = z.infer<typeof CompositeObjectiveSchema>;
