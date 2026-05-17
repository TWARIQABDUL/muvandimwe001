import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function seed() {
    console.log('Starting database seeding...');
    
    // TODO: Initialize your database client (e.g., Prisma, Drizzle, or pg)
    // const db = new MyDbClient(process.env.DATABASE_URL);
    
    try {
        // Example seed logic:
        // await db.user.create({ data: { name: 'Admin', email: 'admin@example.com' } });
        
        console.log('Seeding completed successfully.');
    } catch (error) {
        console.error('Error during seeding:', error);
        process.exit(1);
    }
}

seed();
