import { PrismaClient } from '@prisma/client'

const ensureConnectionConfig = (url: string | undefined) => {
    if (!url) return url;
    if (url.includes('connection_limit=')) return url;
    return url.includes('?') 
        ? `${url}&connection_limit=10&pool_timeout=15` 
        : `${url}?connection_limit=10&pool_timeout=15`;
};

const prismaClientSingleton = () => {
    return new PrismaClient({
        datasources: {
            db: {
                url: ensureConnectionConfig(process.env.DATABASE_URL),
            },
        },
    });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClientSingleton | undefined
}

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
