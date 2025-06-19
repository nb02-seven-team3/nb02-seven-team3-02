import Prisma from "../generated/prisma/index.js";
const db = new Prisma.PrismaClient();
export { db };