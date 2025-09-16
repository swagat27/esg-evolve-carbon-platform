import { db } from '@/db';
import { documents } from '@/db/schema';

async function main() {
    const sampleDocuments = [
        {
            organizationId: 1,
            name: 'ESG Policy v1',
            pathUrl: '/docs/esg_policy_v1.pdf',
            version: 1,
            category: 'POLICY',
            createdAt: new Date('2024-01-15').toISOString(),
        },
        {
            organizationId: 1,
            name: 'ESG Policy v2',
            pathUrl: '/docs/esg_policy_v2.pdf',
            version: 2,
            category: 'POLICY',
            createdAt: new Date('2024-03-20').toISOString(),
        },
        {
            organizationId: 1,
            name: 'Annual Report 2023',
            pathUrl: '/docs/annual_report_2023.pdf',
            version: 1,
            category: 'REPORT',
            createdAt: new Date('2024-02-28').toISOString(),
        },
        {
            organizationId: 2,
            name: 'Environmental Policy v1',
            pathUrl: '/docs/environmental_policy_v1.pdf',
            version: 1,
            category: 'POLICY',
            createdAt: new Date('2024-01-10').toISOString(),
        },
        {
            organizationId: 2,
            name: 'Sustainability Report 2023',
            pathUrl: '/docs/sustainability_report_2023.pdf',
            version: 1,
            category: 'REPORT',
            createdAt: new Date('2024-03-15').toISOString(),
        },
        {
            organizationId: 2,
            name: 'KYC Documents v1',
            pathUrl: '/docs/kyc_documents_v1.pdf',
            version: 1,
            category: 'OTHER',
            createdAt: new Date('2024-02-05').toISOString(),
        }
    ];

    await db.insert(documents).values(sampleDocuments);
    
    console.log('✅ Documents seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});