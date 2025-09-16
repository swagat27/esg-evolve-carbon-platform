import { db } from '@/db';
import { emissions } from '@/db/schema';

async function main() {
    const sampleEmissions = [
        // Organization 1 - January 2024
        {
            organizationId: 1,
            scope: 'SCOPE1',
            periodMonth: '2024-01',
            amountTco2e: 85.5,
            source: 'Manufacturing Operations',
            createdAt: new Date('2024-01-05').toISOString(),
        },
        {
            organizationId: 1,
            scope: 'SCOPE2',
            periodMonth: '2024-01',
            amountTco2e: 62.3,
            source: 'Electricity Consumption',
            createdAt: new Date('2024-01-05').toISOString(),
        },
        {
            organizationId: 1,
            scope: 'SCOPE3',
            periodMonth: '2024-01',
            amountTco2e: 94.7,
            source: 'Supply Chain',
            createdAt: new Date('2024-01-05').toISOString(),
        },
        // Organization 1 - February 2024
        {
            organizationId: 1,
            scope: 'SCOPE1',
            periodMonth: '2024-02',
            amountTco2e: 78.2,
            source: 'Manufacturing Operations',
            createdAt: new Date('2024-02-05').toISOString(),
        },
        {
            organizationId: 1,
            scope: 'SCOPE2',
            periodMonth: '2024-02',
            amountTco2e: 58.9,
            source: 'Electricity Consumption',
            createdAt: new Date('2024-02-05').toISOString(),
        },
        {
            organizationId: 1,
            scope: 'SCOPE3',
            periodMonth: '2024-02',
            amountTco2e: 87.4,
            source: 'Supply Chain',
            createdAt: new Date('2024-02-05').toISOString(),
        },
        // Organization 1 - March 2024
        {
            organizationId: 1,
            scope: 'SCOPE1',
            periodMonth: '2024-03',
            amountTco2e: 92.1,
            source: 'Manufacturing Operations',
            createdAt: new Date('2024-03-05').toISOString(),
        },
        {
            organizationId: 1,
            scope: 'SCOPE2',
            periodMonth: '2024-03',
            amountTco2e: 65.7,
            source: 'Electricity Consumption',
            createdAt: new Date('2024-03-05').toISOString(),
        },
        {
            organizationId: 1,
            scope: 'SCOPE3',
            periodMonth: '2024-03',
            amountTco2e: 101.3,
            source: 'Supply Chain',
            createdAt: new Date('2024-03-05').toISOString(),
        },
        // Organization 1 - April 2024
        {
            organizationId: 1,
            scope: 'SCOPE1',
            periodMonth: '2024-04',
            amountTco2e: 81.8,
            source: 'Manufacturing Operations',
            createdAt: new Date('2024-04-05').toISOString(),
        },
        {
            organizationId: 1,
            scope: 'SCOPE2',
            periodMonth: '2024-04',
            amountTco2e: 59.4,
            source: 'Electricity Consumption',
            createdAt: new Date('2024-04-05').toISOString(),
        },
        {
            organizationId: 1,
            scope: 'SCOPE3',
            periodMonth: '2024-04',
            amountTco2e: 89.6,
            source: 'Supply Chain',
            createdAt: new Date('2024-04-05').toISOString(),
        },
        // Organization 1 - May 2024
        {
            organizationId: 1,
            scope: 'SCOPE1',
            periodMonth: '2024-05',
            amountTco2e: 88.7,
            source: 'Manufacturing Operations',
            createdAt: new Date('2024-05-05').toISOString(),
        },
        {
            organizationId: 1,
            scope: 'SCOPE2',
            periodMonth: '2024-05',
            amountTco2e: 63.2,
            source: 'Electricity Consumption',
            createdAt: new Date('2024-05-05').toISOString(),
        },
        {
            organizationId: 1,
            scope: 'SCOPE3',
            periodMonth: '2024-05',
            amountTco2e: 96.8,
            source: 'Supply Chain',
            createdAt: new Date('2024-05-05').toISOString(),
        },
        // Organization 1 - June 2024
        {
            organizationId: 1,
            scope: 'SCOPE1',
            periodMonth: '2024-06',
            amountTco2e: 95.3,
            source: 'Manufacturing Operations',
            createdAt: new Date('2024-06-05').toISOString(),
        },
        {
            organizationId: 1,
            scope: 'SCOPE2',
            periodMonth: '2024-06',
            amountTco2e: 68.5,
            source: 'Electricity Consumption',
            createdAt: new Date('2024-06-05').toISOString(),
        },
        {
            organizationId: 1,
            scope: 'SCOPE3',
            periodMonth: '2024-06',
            amountTco2e: 103.7,
            source: 'Supply Chain',
            createdAt: new Date('2024-06-05').toISOString(),
        },
        // Organization 2 - January 2024
        {
            organizationId: 2,
            scope: 'SCOPE1',
            periodMonth: '2024-01',
            amountTco2e: 165.8,
            source: 'Manufacturing Operations',
            createdAt: new Date('2024-01-05').toISOString(),
        },
        {
            organizationId: 2,
            scope: 'SCOPE2',
            periodMonth: '2024-01',
            amountTco2e: 145.2,
            source: 'Electricity Consumption',
            createdAt: new Date('2024-01-05').toISOString(),
        },
        {
            organizationId: 2,
            scope: 'SCOPE3',
            periodMonth: '2024-01',
            amountTco2e: 189.6,
            source: 'Supply Chain',
            createdAt: new Date('2024-01-05').toISOString(),
        },
        // Organization 2 - February 2024
        {
            organizationId: 2,
            scope: 'SCOPE1',
            periodMonth: '2024-02',
            amountTco2e: 158.4,
            source: 'Manufacturing Operations',
            createdAt: new Date('2024-02-05').toISOString(),
        },
        {
            organizationId: 2,
            scope: 'SCOPE2',
            periodMonth: '2024-02',
            amountTco2e: 138.7,
            source: 'Electricity Consumption',
            createdAt: new Date('2024-02-05').toISOString(),
        },
        {
            organizationId: 2,
            scope: 'SCOPE3',
            periodMonth: '2024-02',
            amountTco2e: 176.3,
            source: 'Supply Chain',
            createdAt: new Date('2024-02-05').toISOString(),
        },
        // Organization 2 - March 2024
        {
            organizationId: 2,
            scope: 'SCOPE1',
            periodMonth: '2024-03',
            amountTco2e: 172.9,
            source: 'Manufacturing Operations',
            createdAt: new Date('2024-03-05').toISOString(),
        },
        {
            organizationId: 2,
            scope: 'SCOPE2',
            periodMonth: '2024-03',
            amountTco2e: 152.8,
            source: 'Electricity Consumption',
            createdAt: new Date('2024-03-05').toISOString(),
        },
        {
            organizationId: 2,
            scope: 'SCOPE3',
            periodMonth: '2024-03',
            amountTco2e: 198.5,
            source: 'Supply Chain',
            createdAt: new Date('2024-03-05').toISOString(),
        },
        // Organization 2 - April 2024
        {
            organizationId: 2,
            scope: 'SCOPE1',
            periodMonth: '2024-04',
            amountTco2e: 167.3,
            source: 'Manufacturing Operations',
            createdAt: new Date('2024-04-05').toISOString(),
        },
        {
            organizationId: 2,
            scope: 'SCOPE2',
            periodMonth: '2024-04',
            amountTco2e: 147.6,
            source: 'Electricity Consumption',
            createdAt: new Date('2024-04-05').toISOString(),
        },
        {
            organizationId: 2,
            scope: 'SCOPE3',
            periodMonth: '2024-04',
            amountTco2e: 183.9,
            source: 'Supply Chain',
            createdAt: new Date('2024-04-05').toISOString(),
        },
        // Organization 2 - May 2024
        {
            organizationId: 2,
            scope: 'SCOPE1',
            periodMonth: '2024-05',
            amountTco2e: 175.6,
            source: 'Manufacturing Operations',
            createdAt: new Date('2024-05-05').toISOString(),
        },
        {
            organizationId: 2,
            scope: 'SCOPE2',
            periodMonth: '2024-05',
            amountTco2e: 154.1,
            source: 'Electricity Consumption',
            createdAt: new Date('2024-05-05').toISOString(),
        },
        {
            organizationId: 2,
            scope: 'SCOPE3',
            periodMonth: '2024-05',
            amountTco2e: 192.7,
            source: 'Supply Chain',
            createdAt: new Date('2024-05-05').toISOString(),
        },
        // Organization 2 - June 2024
        {
            organizationId: 2,
            scope: 'SCOPE1',
            periodMonth: '2024-06',
            amountTco2e: 181.2,
            source: 'Manufacturing Operations',
            createdAt: new Date('2024-06-05').toISOString(),
        },
        {
            organizationId: 2,
            scope: 'SCOPE2',
            periodMonth: '2024-06',
            amountTco2e: 159.3,
            source: 'Electricity Consumption',
            createdAt: new Date('2024-06-05').toISOString(),
        },
        {
            organizationId: 2,
            scope: 'SCOPE3',
            periodMonth: '2024-06',
            amountTco2e: 205.4,
            source: 'Supply Chain',
            createdAt: new Date('2024-06-05').toISOString(),
        },
    ];

    await db.insert(emissions).values(sampleEmissions);
    
    console.log('✅ Emissions seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});