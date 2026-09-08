import { readdir, readFile, writeFile } from "node:fs/promises";
const root = new URL("../supabase/", import.meta.url);
const files = (await readdir(new URL("migrations/", root)))
  .filter((file) => file.endsWith(".sql"))
  .sort();
let sql =
  "-- Minarah: run ONCE on a new Supabase project in SQL Editor.\n-- Existing projects: use the versioned migration workflow instead.\n-- No sample mosque data or privileged accounts are included.\nbegin;\n";
for (const file of files)
  sql += `\n-- ${file}\n${await readFile(new URL(`migrations/${file}`, root), "utf8")}\n`;
sql += "\ncommit;\n";
await writeFile(new URL("setup.sql", root), sql);
console.log(
  `Prepared supabase/setup.sql from ${files.length} migrations. No remote database was changed.`,
);
