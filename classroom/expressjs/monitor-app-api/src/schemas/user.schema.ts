import { z } from 'zod';

const createBody = z
  .strictObject({
    name: z.string().trim().min(3, 'O nome deve ter no mínimo 3 caracteres'),
    email: z.string().trim().toLowerCase().email('E-mail inválido'),
    password: z.string().min(8, 'A senha deve ter no mínimo 8 caracteres'),
    /**
     * Exigência da interface, não do domínio: não vai para o banco, e por isso
     * o controller a separa antes de chamar o model.
     */
    confirmationPassword: z.string().optional(),
  })
  .refine(
    ({ password, confirmationPassword }) =>
      confirmationPassword === undefined || password === confirmationPassword,
    {
      error: 'As senhas não conferem',
      path: ['confirmationPassword'],
    },
  );

export const createUserSchema = z.object({ body: createBody });

export type CreateUserBody = z.infer<typeof createBody>;
