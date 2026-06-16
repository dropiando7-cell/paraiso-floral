const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'landing_settings' }
    });
    console.log("landing_settings value:", setting ? JSON.stringify(JSON.parse(setting.value), null, 2) : "not found");
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
