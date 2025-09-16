import { db } from '@/db';
import { priceForecasts } from '@/db/schema';

async function main() {
    const samplePriceForecasts = [
        {
            standard: 'VERRA',
            horizonMonths: 3,
            model: 'ML_REGRESSION_V2',
            predictedPrice: 22.50,
            generatedAt: new Date('2024-01-15T10:30:00').toISOString(),
        },
        {
            standard: 'VERRA',
            horizonMonths: 6,
            model: 'ML_REGRESSION_V2',
            predictedPrice: 24.80,
            generatedAt: new Date('2024-01-15T10:30:00').toISOString(),
        },
        {
            standard: 'VERRA',
            horizonMonths: 12,
            model: 'ML_REGRESSION_V2',
            predictedPrice: 28.60,
            generatedAt: new Date('2024-01-15T10:30:00').toISOString(),
        },
        {
            standard: 'GOLD_STANDARD',
            horizonMonths: 3,
            model: 'ARIMA_FORECAST',
            predictedPrice: 27.25,
            generatedAt: new Date('2024-01-15T11:15:00').toISOString(),
        },
        {
            standard: 'GOLD_STANDARD',
            horizonMonths: 6,
            model: 'ARIMA_FORECAST',
            predictedPrice: 30.15,
            generatedAt: new Date('2024-01-15T11:15:00').toISOString(),
        },
        {
            standard: 'GOLD_STANDARD',
            horizonMonths: 12,
            model: 'ARIMA_FORECAST',
            predictedPrice: 33.50,
            generatedAt: new Date('2024-01-15T11:15:00').toISOString(),
        },
        {
            standard: 'CDM',
            horizonMonths: 6,
            model: 'ML_REGRESSION_V2',
            predictedPrice: 20.30,
            generatedAt: new Date('2024-01-15T14:20:00').toISOString(),
        },
        {
            standard: 'CDM',
            horizonMonths: 12,
            model: 'ML_REGRESSION_V2',
            predictedPrice: 25.75,
            generatedAt: new Date('2024-01-15T14:20:00').toISOString(),
        },
    ];

    await db.insert(priceForecasts).values(samplePriceForecasts);
    
    console.log('✅ Price forecasts seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});