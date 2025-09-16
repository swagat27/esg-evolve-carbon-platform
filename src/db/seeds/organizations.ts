import { db } from '@/db';
import { organizations } from '@/db/schema';

async function main() {
    const sampleOrganizations = [
        {
            name: 'GreenTech Solutions',
            cinOrRegistration: 'U72900MH2015PTC278900',
            gstOrTaxId: '27ABC1234567E1Z5',
            address: 'Unit 12B, 12th Floor, World Trade Center, Cuffe Parade, Mumbai, Maharashtra 400005',
            country: 'India',
            contactEmail: 'contact@greentechsolutions.in',
            contactPhone: '+91 22 6798 1234',
            industry: 'Information Technology & Services',
            annualEmissionsBaseline: 1500.0,
            kycStatus: 'verified',
            createdAt: new Date('2023-08-10').toISOString(),
            updatedAt: new Date('2023-08-10').toISOString(),
        },
        {
            name: 'Carbon Dynamics Ltd',
            cinOrRegistration: '55-12345678',
            gstOrTaxId: '01-987654321-C',
            address: '1850 Industrial Boulevard, Suite 450, Detroit, Michigan 48207',
            country: 'USA',
            contactEmail: 'info@carbondynamics.com',
            contactPhone: '+1 313 555 8920',
            industry: 'Automotive Component Manufacturing',
            annualEmissionsBaseline: 3200.5,
            kycStatus: 'pending',
            createdAt: new Date('2023-10-01').toISOString(),
            updatedAt: new Date('2023-10-01').toISOString(),
        },
    ];

    await db.insert(organizations).values(sampleOrganizations);

    console.log('✅ Organizations seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});