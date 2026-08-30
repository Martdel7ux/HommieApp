import { z } from 'zod';

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .email('Enter a valid email address');

export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(72, 'Password is too long');

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const signUpSchema = z
  .object({
    role: z.enum(['student', 'landlord']),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    firstName: z.string().trim().min(1, 'This field is required').max(60),
    // landlord only
    contactName: z.string().trim().max(120).optional(),
    businessName: z.string().trim().max(120).optional(),
    phone: z.string().trim().max(30).optional(),
    acceptTerms: z.literal(true, { message: 'Please accept the terms to continue' }),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((v) => v.role !== 'landlord' || !!v.phone, {
    message: 'Phone number is required for landlords',
    path: ['phone'],
  });
export type SignUpInput = z.infer<typeof signUpSchema>;

export const resetRequestSchema = z.object({ email: emailSchema });
export type ResetRequestInput = z.infer<typeof resetRequestSchema>;

export const newPasswordSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type NewPasswordInput = z.infer<typeof newPasswordSchema>;
