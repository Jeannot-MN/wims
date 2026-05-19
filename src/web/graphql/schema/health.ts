import { builder } from "../builder";

const HealthStatus = builder.objectRef<{ ok: boolean; database: string; now: string }>("HealthStatus").implement({
  fields: (t) => ({
    ok: t.boolean({ resolve: (root) => root.ok }),
    database: t.string({ resolve: (root) => root.database }),
    now: t.string({ resolve: (root) => root.now }),
  }),
});

builder.queryField("health", (t) =>
  t.field({
    type: HealthStatus,
    resolve: async (_root, _args, ctx) => {
      const result = await ctx.dataSource.query<{ version: string; now: Date }[]>(
        "SELECT version() as version, now() as now",
      );
      const row = result[0];
      return {
        ok: true,
        database: row?.version ?? "unknown",
        now: row?.now ? new Date(row.now).toISOString() : new Date().toISOString(),
      };
    },
  }),
);
