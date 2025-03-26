/**
 * Main entry point for the channel listing scraper
 * Orchestrates the execution of all provider-specific scrapers
 */

import { runScraper } from './utils/scraper';
import directvConfig from './scrapers/directv';
import dishConfig from './scrapers/dish';
import skyConfig from './scrapers/sky';
import virginConfig from './scrapers/virgin';

interface ScraperDefinition {
    name: string;
    config: typeof directvConfig;
}

interface ScraperResult {
    name: string;
    success: boolean;
    duration: number;
    channelCount?: number;
    error?: Error;
}

/**
 * List of all available scrapers with their configurations
 */
const SCRAPERS: ScraperDefinition[] = [
    { name: 'DIRECTV', config: directvConfig },
    { name: 'DISH', config: dishConfig },
    { name: 'SKY', config: skyConfig },
    { name: 'Virgin', config: virginConfig }
];

/**
 * Maximum number of scrapers to run in parallel
 */
const MAX_CONCURRENT_SCRAPERS = 4;

/**
 * Executes a single scraper and collects metrics
 */
async function executeScraper(scraper: ScraperDefinition): Promise<ScraperResult> {
    const startTime = Date.now();
    try {
        const channels = await runScraper(scraper.config);
        const duration = Date.now() - startTime;
        console.log(`${scraper.name} scraper found ${channels.length} channels and completed in ${duration}ms`);
        return {
            name: scraper.name,
            success: true,
            duration,
            channelCount: channels.length
        };
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`${scraper.name} scraper failed after ${duration}ms:`, error);
        return {
            name: scraper.name,
            success: false,
            duration,
            error: error as Error
        };
    }
}

/**
 * Runs scrapers in parallel with a concurrency limit
 */
async function runAllScrapers(): Promise<void> {
    console.log(`Starting scrapers (max ${MAX_CONCURRENT_SCRAPERS} in parallel)...\n`);
    
    const results: ScraperResult[] = [];
    const queue = [...SCRAPERS];
    const inProgress: Array<Promise<ScraperResult>> = [];

    // Process scrapers with concurrency limit
    while (queue.length > 0 || inProgress.length > 0) {
        while (inProgress.length < MAX_CONCURRENT_SCRAPERS && queue.length > 0) {
            const scraper = queue.shift()!;
            inProgress.push(executeScraper(scraper));
        }

        const completedResults = await Promise.all(inProgress);
        results.push(...completedResults);
        inProgress.length = 0;
    }

    // Print summary
    console.log('\nScraping Summary:');
    console.log('----------------');
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    const totalChannels = successful.reduce((sum, r) => sum + (r.channelCount || 0), 0);
    
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log(`Success Rate: ${successful.length}/${results.length}`);
    console.log(`Total Channels: ${totalChannels}`);
    
    if (failed.length > 0) {
        console.log('\nFailed Scrapers:');
        failed.forEach(result => {
            console.log(`- ${result.name}: ${result.error?.message}`);
        });
        process.exit(1);
    }
}

// Execute all scrapers if this file is run directly
if (require.main === module) {
    runAllScrapers().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
} 