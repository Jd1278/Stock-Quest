import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { config } from "../config/env";
import { db, repository, AppError } from "../repositories";
import { registration, profile } from "../validators";
export const authService = {
  async register(input: z.infer<typeof registration>, leaderId?: string) {
    const { password, ...data } = input;
    const user = await db.user.create({
      data: {
        ...data,
        passwordHash: await bcrypt.hash(password, 12),
        leaderId,
        role: "APRENDIZ",
      },
    });
    return repository.profile(user.id);
  },
  async login(email: string, password: string) {
    const user = await repository.userByEmail(email);
    if (
      !user ||
      !user.active ||
      !(await bcrypt.compare(password, user.passwordHash))
    )
      throw new AppError(401, "Correo o contraseña incorrectos.");
    const token = jwt.sign({ version: user.tokenVersion }, config.JWT_SECRET, {
      subject: user.id,
      expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
      algorithm: "HS256",
      issuer: "stock-quest",
      audience: "stock-quest-web",
    });
    return { token, user: await repository.profile(user.id) };
  },
  async logout(id: string) {
    await db.user.update({
      where: { id },
      data: { tokenVersion: { increment: 1 } },
    });
  },
  async update(id: string, input: z.infer<typeof profile>) {
    const { password, currentPassword, ...data } = input;
    const user = await repository.userById(id);
    if (!user) throw new AppError(404, "Usuario no encontrado.");
    if (
      (password || data.email) &&
      (!currentPassword ||
        !(await bcrypt.compare(currentPassword, user.passwordHash)))
    )
      throw new AppError(400, "Confirma tu contraseña actual.");
    await db.user.update({
      where: { id },
      data: {
        ...data,
        ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
        ...(password || data.email ? { tokenVersion: { increment: 1 } } : {}),
      },
    });
    return repository.profile(id);
  },
};
