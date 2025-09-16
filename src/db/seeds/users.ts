import { db } from '@/db';
import { users } from '@/db/schema';

async function main() {
    const sampleUsers = [
        {
            email: 'sarah.chen@techmarket.com',
            name: 'Sarah Chen',
            role: 'CFO',
            authUserId: 'user_01h4kxt2e8z9y3b1n7m6q5w8r4',
            organizationId: 1,
            createdAt: new Date('2024-01-15T09:00:00Z').toISOString(),
            updatedAt: new Date('2024-01-15T09:00:00Z').toISOString(),
        },
        {
            email: 'james.rodriguez@techmarket.com',
            name: 'James Rodriguez',
            role: 'ESGLead',
            authUserId: 'user_02h5mzu3f0a8y4c2d8e7f6g5h1',
            organizationId: 1,
            createdAt: new Date('2024-01-20T14:30:00Z').toISOString(),
            updatedAt: new Date('2024-01-20T14:30:00Z').toISOString(),
        },
        {
            email: 'priya.patel@greenmanufacturing.com',
            name: 'Priya Patel',
            role: 'PlantHead',
            authUserId: 'user_03h6n0v4g1b9z5d3f9g8h7i2j6',
            organizationId: 2,
            createdAt: new Date('2024-02-01T08:15:00Z').toISOString(),
            updatedAt: new Date('2024-02-01T08:15:00Z').toISOString(),
        },
        {
            email: 'david.kim@greenmanufacturing.com',
            name: 'David Kim',
            role: 'ESGLead',
            authUserId: 'user_04h7o1w5h2c0a6e4h0i9j8k3l7',
            organizationId: 2,
            createdAt: new Date('2024-02-05T11:45:00Z').toISOString(),
            updatedAt: new Date('2024-02-05T11:45:00Z').toISOString(),
        }
    ];

    await db.insert(users).values(sampleUsers);
    
    console.log('✅ Users seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});