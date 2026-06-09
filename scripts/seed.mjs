/**
 * Script de seed para criar os 17 usuários no banco Neon Postgres
 * Executar após criar o banco: node scripts/seed.mjs
 *
 * Requer: DATABASE_URL no ambiente (ou arquivo .env na raiz)
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import bcrypt from "bcryptjs";
import "dotenv/config";

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

async function createTables() {
  console.log("Criando tabelas...");
  await sql`
    CREATE TYPE IF NOT EXISTS employee_role AS ENUM ('employee', 'launcher', 'admin');
    CREATE TYPE IF NOT EXISTS session_status AS ENUM ('open', 'closed', 'divergent');
    CREATE TYPE IF NOT EXISTS confirm_status AS ENUM ('pending', 'confirmed', 'rejected');
    CREATE TYPE IF NOT EXISTS user_role AS ENUM ('user', 'admin');

    CREATE TABLE IF NOT EXISTS employees (
      id SERIAL PRIMARY KEY,
      name VARCHAR(128) NOT NULL,
      username VARCHAR(64) NOT NULL UNIQUE,
      "passwordHash" VARCHAR(256) NOT NULL,
      role employee_role NOT NULL DEFAULT 'employee',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS planting_sessions (
      id SERIAL PRIMARY KEY,
      "plantingDate" TIMESTAMP NOT NULL,
      greenhouses JSON NOT NULL,
      "totalSeedlingsSent" INTEGER NOT NULL,
      "totalSeedlingsPlanted" INTEGER NOT NULL DEFAULT 0,
      status session_status NOT NULL DEFAULT 'open',
      "closeNote" TEXT,
      "openedById" INTEGER NOT NULL,
      "closedById" INTEGER,
      "closedAt" TIMESTAMP,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS chrysanthemum_plantings (
      id SERIAL PRIMARY KEY,
      "sessionId" INTEGER,
      "employeeId" INTEGER NOT NULL,
      "plantingDate" TIMESTAMP NOT NULL,
      greenhouses JSON NOT NULL,
      "totalSeedlingsSent" INTEGER NOT NULL DEFAULT 0,
      "totalSeedlings" INTEGER NOT NULL,
      "totalBoxes" INTEGER NOT NULL,
      "discountBoxes" INTEGER NOT NULL DEFAULT 0,
      "discountReason" TEXT,
      "absenceReason" TEXT,
      "launchedById" INTEGER NOT NULL,
      "confirmStatus" confirm_status NOT NULL DEFAULT 'pending',
      "confirmRejectionReason" TEXT,
      "confirmedAt" TIMESTAMP,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sunflower_plantings (
      id SERIAL PRIMARY KEY,
      "employeeId" INTEGER NOT NULL,
      "plantingDate" TIMESTAMP NOT NULL,
      trays INTEGER NOT NULL,
      "discountTrays" INTEGER NOT NULL DEFAULT 0,
      "discountReason" TEXT,
      "absenceReason" TEXT,
      "launchedById" INTEGER NOT NULL,
      "confirmStatus" confirm_status NOT NULL DEFAULT 'pending',
      "confirmRejectionReason" TEXT,
      "confirmedAt" TIMESTAMP,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;
  console.log("✅ Tabelas criadas!");
}

async function seedUsers() {
  console.log("Criando usuários...");

  const users = [
    { name: "Administrador", username: "admin", password: "admin123", role: "admin" },
    { name: "Lançador", username: "lancador", password: "lancador123", role: "launcher" },
    { name: "Funcionário 01", username: "func01", password: "senha01", role: "employee" },
    { name: "Funcionário 02", username: "func02", password: "senha02", role: "employee" },
    { name: "Funcionário 03", username: "func03", password: "senha03", role: "employee" },
    { name: "Funcionário 04", username: "func04", password: "senha04", role: "employee" },
    { name: "Funcionário 05", username: "func05", password: "senha05", role: "employee" },
    { name: "Funcionário 06", username: "func06", password: "senha06", role: "employee" },
    { name: "Funcionário 07", username: "func07", password: "senha07", role: "employee" },
    { name: "Funcionário 08", username: "func08", password: "senha08", role: "employee" },
    { name: "Funcionário 09", username: "func09", password: "senha09", role: "employee" },
    { name: "Funcionário 10", username: "func10", password: "senha10", role: "employee" },
    { name: "Funcionário 11", username: "func11", password: "senha11", role: "employee" },
    { name: "Funcionário 12", username: "func12", password: "senha12", role: "employee" },
    { name: "Funcionário 13", username: "func13", password: "senha13", role: "employee" },
    { name: "Funcionário 14", username: "func14", password: "senha14", role: "employee" },
    { name: "Funcionário 15", username: "func15", password: "senha15", role: "employee" },
  ];

  for (const user of users) {
    const hash = await bcrypt.hash(user.password, 10);
    await sql`
      INSERT INTO employees (name, username, "passwordHash", role)
      VALUES (${user.name}, ${user.username}, ${hash}, ${user.role}::employee_role)
      ON CONFLICT (username) DO NOTHING
    `;
    console.log(`  ✓ ${user.username}`);
  }

  console.log("✅ Usuários criados!");
}

async function main() {
  console.log("🌱 Iniciando seed do banco de dados...\n");
  await createTables();
  await seedUsers();
  console.log("\n🎉 Seed concluído com sucesso!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Erro no seed:", err);
  process.exit(1);
});
