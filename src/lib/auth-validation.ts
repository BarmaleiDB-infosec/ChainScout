import { z } from "zod";

export const signUpSchema = z.object({
  email: z
    .string()
    .min(1, "Email обязателен")
    .email("Некорректный формат email"),
  password: z
    .string()
    .min(8, "Пароль должен содержать минимум 8 символов")
    .regex(/[A-Z]/, "Пароль должен содержать хотя бы одну заглавную букву")
    .regex(/[a-z]/, "Пароль должен содержать хотя бы одну строчную букву")
    .regex(/[0-9]/, "Пароль должен содержать хотя бы одну цифру"),
});

export const signInSchema = z.object({
  email: z
    .string()
    .min(1, "Email обязателен")
    .email("Некорректный формат email"),
  password: z
    .string()
    .min(1, "Пароль обязателен"),
});

export type SignUpFormData = z.infer<typeof signUpSchema>;
export type SignInFormData = z.infer<typeof signInSchema>;

