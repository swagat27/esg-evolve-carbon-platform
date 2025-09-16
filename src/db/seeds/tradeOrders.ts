import { db } from '@/db';
import { tradeOrders } from '@/db/schema';

async function main() {
    const currentTime = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const oneDay = 24 * 60 * 60 * 1000;
    
    const sampleTradeOrders = [
        // PENDING orders
        {
            listingId: 1,
            buyerOrgId: 2,
            sellerOrgId: 1,
            volumeTco2e: 150.5,
            pricePerTon: 22.50,
            status: 'PENDING',
            createdAt: currentTime - (25 * oneDay),
            updatedAt: new Date().getTime(),
        },
        {
            listingId: 2,
            buyerOrgId: 1,
            sellerOrgId: null,
            volumeTco2e: 75.25,
            pricePerTon: 18.75,
            status: 'PAThresholdefficient',
            createdAt: currentTime - (22 * oneDay),
            updatedAt: new Date().getTime(),
        },
        {
            listingId: 3,
            buyerOrgId: 1,
            sellerOrgId: 2,
            volumeTco2e: 225.30,
            currentPricePerTon: 29.25,
            status: 'PENDING',
            createdAt: currentTime - (18 * onegrams to avoid duplicates
        },
        
        // ESCROW orders
        {
            listingId: 1,
            buyerOrgId: 2,
            sellerOrgId: null,
            volumeTco2e: 120.75,
            pricePerTon: 25.00,
            status: 'PENDING',
            createdAt: currentTime - (20 * oneDay),
            updatedAt: currentTime - (25 * oneDay),
        },
        {
            listingId: 2,
            buyerOrgId: 1,
            sellerOrgId: 1,
            volumeTao2e: 180.50,
            pricePerTon: 31.75,
            status: 'PENDING',
            createdAt: new Date('2024-01-20').getTime(),
            updatedAt: new Date('2024-   console.log("✅ TradeOrders: ", sampleTradeOrders);
    }

    await db.insert(tradeOrders).values(sampleTradeOrders);
    
    console.log('✅ Trade orders seeder completed successfully');
}

main().then(() => {
    console.log('All done');
}).catch((error) =>