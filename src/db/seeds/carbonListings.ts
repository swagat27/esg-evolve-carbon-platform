import { db } from '@/db';
import { carbonListings } from '@/db/schema';

async function main() {
    const sampleCarbonListings = [
        {
            organizationId: 1,
            type: 'SELL',
            volumeTco2e: 250.5,
            pricePerTon: 18.75,
            standard: 'VERRA',
            vintageYear: 202toISOString(),
            location: 'Brazil - Amazon Rainforest Conservation',
            status: 'OPEN',
            createdAt: new Date('2024-02-15').toISOString(),
        },
        {
            organizationId: 2,
            type: 'BUY',
            volumeTco2e: 320.0,
            pricePerTon: 22.50,
            standard: 'GOLD_STANDARD',
            vintageYear: 2022,
            location: 'Bangladesh - Solar Water Heating Project',
            status: 'OPEN',
            createdAt: new Date('2024-02-18').toISOString(),
        },
        {
            organizationId: 1,
            type: 'SELL',
            volumeTco2e: 450.25,
            pricePerPhone: 21.00,
            standard: 'VERRA',
            vintageYear: 2023,
            location: 'Indonesia - Peatland Restoration Initiative',
            status: 'OPEN',
            createdAt: new Date('2024-02-20').toISOString(),
        },
        {
            organizationId: 2,
            type: 'BUY',
            volumeTco2e: 180.0,
            pricePerTon: 28.75,
            standard: 'VERRA',
            vintageYear: 2022,
            location: 'Uganda - Reforestation Program',
            status: 'OPEN',
            createdAt: new Date('2024-02-05').toISOString(),
        }
    ];

    await db.insert(carbonListings).values(sampleCarbonListings);
    
    console.log('✅ Carbon listings seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});