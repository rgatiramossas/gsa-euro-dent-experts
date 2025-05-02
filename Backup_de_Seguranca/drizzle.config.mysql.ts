import { defineConfig } from "drizzle-kit";

if (!process.env.MYSQL_HOST || 
    !process.env.MYSQL_USER || 
    !process.env.MYSQL_PASSWORD || 
    !process.env.MYSQL_DATABASE || 
    !process.env.MYSQL_PORT) {
  throw new Error(
    "MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE e MYSQL_PORT devem estar configurados."
  );
}

export default defineConfig({
  out: "./migrations-mysql",
  schema: "./shared/schema.mysql.ts",
  dialect: "mysql",
  dbCredentials: {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: parseInt(process.env.MYSQL_PORT),
  },
});