import { db } from '@/db';
import { escrows } from '@/db/schema';

async function main() {
    const now = Date.now();
    const fifteenDaysAgo = now - 15 * 24 * 60 * 60 * 1000;
    
    const sampleEscrows = [
        {
            orderId: 1,
            amount: 4500.00,
            currency: 'USD',
            status: 'HELD',
            createdAt: fifteenDaysAgo + 1 * 24 * 60 * 60 * 1000, // 1 day after 15 days ago
            releasedAt: null,
        },
        {
            orderId: 2,
            amount: 12500.00,
            currency: 'USD',
            status: 'HELD',
            createdAt: fifteenDaysAgo + 4 * 24 * 60 * 60 * 1000, // 4 days after 15 days ago
            releasedAt: null,
        },
        {
            orderId: 3,
            amount: 7600.00,
            currency: 'USD',
            status: 'RELEASED',
            createdAt: fifteenDaysAgo + 7 * 24 * 60 * 60 * 1000, // 7 days after 15 days ago
            releasedAt: fifteenDaysAgo + 12 * 24 * 60 * 60 * 1000, // Released 5 days after creation
        },
        {
            orderId: 4,
            amount: 9800.00,
            currency: 'USD',
            status: 'HELD',
            createdAt: fifteenDaysAgo + 10 * 24 * 60 * 60 * 1000, // 10 days after 15 days ago
            releasedAt: null,
        },
        {
            orderId: 5,
            amount: 3200.00,
            currency: 'USD',
            status: 'RELEASED',
            createdAt: fifteenDaysAgo + 13 * 24 * `60 * 60 * 1000, // 13 days after 60 * 60 * 1000, // 13 days after 15 days ago
            releasedAt: fifteenDaysAgo + 14 * 24 * 60 * 60 * 1000, // Released 1 day after creation