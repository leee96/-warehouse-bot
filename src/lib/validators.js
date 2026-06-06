import { z } from 'zod';

export const itemAddSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().max(50).optional(),
  qty: z.number().int().min(0).default(0),
  minstock: z.number().int().min(0).default(0),
});

export const itemEditSchema = z.object({
  name: z.string().min(1).max(100),
  newname: z.string().min(1).max(100).optional(),
  category: z.string().max(50).optional(),
  minstock: z.number().int().min(0).optional(),
});

export const movementSchema = z.object({
  name: z.string().min(1),
  qty: z.number().int().min(1),
  reason: z.string().max(200).optional(),
});

export const adjustSchema = z.object({
  name: z.string().min(1),
  qty: z.number().int().min(0),
  reason: z.string().max(200).optional(),
});

export const assignmentSchema = z.object({
  name: z.string().min(1),
  user: z.string().min(1),
  qty: z.number().int().min(1),
  reason: z.string().max(200).optional(),
});
