// Copies the Drizzle migrations into dist/migrations for deployment to D1.
// Remote D1 rejects some complex CREATE TRIGGER statements inside migration
// files, so they are stripped from the deployable copy; the runtime repairer in
// db/index.ts installs them on first use. The source migrations keep them.
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";

const BREAKPOINT = "--> statement-breakpoint";
const source = new URL("../drizzle/", import.meta.url);
const destination = new URL("../dist/migrations/", import.meta.url);
const deploymentMigrations = [
  { file: "0013_shocking_vermin.sql", expectedTriggers: 20 },
  { file: "0014_right_sentry.sql", expectedTriggers: 4 },
  { file: "0015_square_sway.sql", expectedTriggers: 6 },
];

await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await cp(source, destination, {
  recursive: true,
  filter: (path) => !path.includes("/meta"),
});

for (const migration of deploymentMigrations) {
  const migrationUrl = new URL(migration.file, destination);
  const sql = await readFile(migrationUrl, "utf8");
  const statements = sql.split(BREAKPOINT);
  const deployable = statements.filter(
    (statement) => !/^\s*CREATE\s+TRIGGER\b/iu.test(statement),
  );
  const removedTriggers = statements.length - deployable.length;
  if (removedTriggers !== migration.expectedTriggers) {
    throw new Error(
      `${migration.file}: se esperaban ${migration.expectedTriggers} triggers y se encontraron ${removedTriggers}.`,
    );
  }
  await writeFile(migrationUrl, deployable.join(BREAKPOINT), "utf8");
}
