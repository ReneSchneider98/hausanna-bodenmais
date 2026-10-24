import { z } from 'zod';

export const dependencyStatusSchema = z.enum(['up', 'down']);
export type DependencyStatus = z.infer<typeof dependencyStatusSchema>;

export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  dependencies: z.record(z.string(), dependencyStatusSchema),
  timestamp: z.string(),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;
