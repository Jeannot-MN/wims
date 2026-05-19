import { builder } from "../builder";
import { authServiceFromCtx } from "../services";
import { wrap } from "../utils/errors";
import { requireAuth } from "../utils/require-auth";
import { UserEntity } from "@/infrastructure/db/entities/User";

const Me = builder.objectRef<{ id: string; email: string }>("Me").implement({
  fields: (t) => ({
    id: t.exposeID("id"),
    email: t.exposeString("email"),
  }),
});

const LoginPayload = builder
  .objectRef<{ token: string; expiresAt: Date; user: { id: string; email: string } }>("LoginPayload")
  .implement({
    fields: (t) => ({
      token: t.exposeString("token"),
      expiresAt: t.field({ type: "DateTime", resolve: (p) => p.expiresAt }),
      user: t.field({ type: Me, resolve: (p) => p.user }),
    }),
  });

const SignupPayload = builder.objectRef<{ userId: string }>("SignupPayload").implement({
  fields: (t) => ({
    userId: t.exposeID("userId"),
  }),
});

builder.queryField("me", (t) =>
  t.field({
    type: Me,
    nullable: true,
    resolve: async (_root, _args, ctx) => {
      if (!ctx.currentUser) return null;
      const repo = ctx.dataSource.getRepository(UserEntity);
      const user = await repo.findOne({ where: { id: ctx.currentUser.id } });
      if (!user) return null;
      return { id: user.id, email: user.email };
    },
  }),
);

builder.mutationField("signup", (t) =>
  t.field({
    type: SignupPayload,
    args: {
      email: t.arg.string({ required: true }),
      password: t.arg.string({ required: true }),
    },
    resolve: (_root, args, ctx) =>
      wrap(async () => {
        const auth = authServiceFromCtx(ctx);
        return await auth.signup({ email: args.email, password: args.password });
      }),
  }),
);

builder.mutationField("verifyEmail", (t) =>
  t.field({
    type: "Boolean",
    args: { token: t.arg.string({ required: true }) },
    resolve: (_root, args, ctx) =>
      wrap(async () => {
        const auth = authServiceFromCtx(ctx);
        await auth.verifyEmail(args.token);
        return true;
      }),
  }),
);

builder.mutationField("login", (t) =>
  t.field({
    type: LoginPayload,
    args: {
      email: t.arg.string({ required: true }),
      password: t.arg.string({ required: true }),
    },
    resolve: (_root, args, ctx) =>
      wrap(async () => {
        const auth = authServiceFromCtx(ctx);
        const result = await auth.login({ email: args.email, password: args.password });
        return {
          token: result.token,
          expiresAt: result.expiresAt,
          user: { id: result.userId, email: result.email },
        };
      }),
  }),
);

builder.mutationField("requestPasswordReset", (t) =>
  t.field({
    type: "Boolean",
    args: { email: t.arg.string({ required: true }) },
    resolve: (_root, args, ctx) =>
      wrap(async () => {
        const auth = authServiceFromCtx(ctx);
        await auth.requestPasswordReset(args.email);
        return true;
      }),
  }),
);

builder.mutationField("resetPassword", (t) =>
  t.field({
    type: "Boolean",
    args: {
      token: t.arg.string({ required: true }),
      newPassword: t.arg.string({ required: true }),
    },
    resolve: (_root, args, ctx) =>
      wrap(async () => {
        const auth = authServiceFromCtx(ctx);
        await auth.resetPassword({ token: args.token, newPassword: args.newPassword });
        return true;
      }),
  }),
);

// Force module to be considered "used" by the schema index even before more types are exported.
export const _authModuleLoaded = true;

// Re-export for resolvers that need this from elsewhere.
export { requireAuth };
