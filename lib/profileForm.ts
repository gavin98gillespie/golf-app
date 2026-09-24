import { z } from 'zod';
import { explainProfanity } from './profanity';

export const ProfileBasicsSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(1, 'Enter your name')
      .max(60, 'Name must be 60 characters or less'),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .min(3, 'Username needs at least 3 characters')
      .max(30, 'Username must be 30 characters or less')
      .regex(/^[a-z0-9_]+$/, 'Use letters, numbers and underscores for your username'),
  })
  .superRefine((data, ctx) => {
    for (const field of ['displayName', 'username'] as const) {
      const message = explainProfanity(data[field]);
      if (message) ctx.addIssue({ code: 'custom', path: [field], message });
    }
  });
export const SignUpSchema = ProfileBasicsSchema.safeExtend({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(8, 'Password needs at least 8 characters'),
});
