import { db } from '@/db';
import { alerts } from '@/db/schema';

async function main() {
    const sampleAlerts = [
        {
            organizationId: 1,
            type: 'KYC',
            message: 'KYC verification pending for TechCorp Manufacturing. Please submit required documents for verification.',
            severity: 'critical',
            isRead: false,
            createdAt: new Date('2024-01-05T09:30:00').toISOString(),
        },
        {
            organizationId: 2,
            type: 'EMISSIONS_SPIKE',
            message: 'Monthly emissions exceeded baseline by 35%. Scope 2 emissions show unusual spike in December data.',
            severity: 'warning',
            isRead: true,
            createdAt: new Date('2024-01-08T14:20:00').toISOString(),
        },
        {
            organizationId: 1,
            type: 'LISTING_MATCH',
            message: 'High probability match found for your carbon credit listing. Buy order from GreenEnergy Corp aligns with your vintage year requirements.',
            severity: 'info',
            isRead: false,
            createdAt: new Date('2024-01-10T11:15:00').toISOString(),
        },
        {
            organizationId: 2,
            type: 'DEADLINE',
            message: 'ESG reporting deadline approaching. Complete emissions data submission required by January 31st, 2024.',
            severity: 'info',
            isRead: false,
            createdAt: new Date('2024-01-12T08:00:00').toISOString(),
        },
        {
            organizationId: 1,
            type: 'EMISSIONS_SPIKE',
            message: 'Unusual emissions pattern detected in Scope 3 category. Transportation emissions increased 150% compared to previous month.',
            severity: 'warning',
            isRead: true,
            createdAt: new Date('2024-01-14T16:45:00').toISOString(),
        },
        {
            organizationId: 2,
            type: 'KYC',
            message: 'KYC verification rejected for Renewable Energy Solutions Ltd. Compliance team requires additional documentation.',
            severity: 'critical',
            isRead: true,
            createdAt: new Date('2024-01-16T13:30:00').toISOString(),
        }
    ];

    await db.insert(alerts).values(sampleAlerts);
    
    console.log('✅ Alerts seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});