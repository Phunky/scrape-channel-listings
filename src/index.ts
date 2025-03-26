/**
 * Main entry point for the channel listing scraper
 * Orchestrates the execution of all provider-specific scrapers
 */

import { runScraper, runScraperCLI, type ScraperConfig } from './utils/scraper';
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
    channels?: Array<{ number: string; name: string; }>;
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
async function executeScraper(scraper: ScraperDefinition, writeFiles: boolean): Promise<ScraperResult> {
    const startTime = Date.now();
    try {        
        const config = {
            ...scraper.config,
            outputFile: writeFiles ? scraper.config.outputFile : undefined
        };
        
        const channels = await runScraper(config);
        const duration = Date.now() - startTime;
        
        if (writeFiles) {
            console.log(`${scraper.name} scraper found ${channels.length} channels and completed in ${duration}ms`);
        }
        
        return {
            name: scraper.name,
            success: true,
            duration,
            channelCount: channels.length,
            channels: channels
        };
    } catch (error) {
        const duration = Date.now() - startTime;
        if (writeFiles) {
            console.error(`${scraper.name} scraper failed after ${duration}ms:`, error);
        }
        return {
            name: scraper.name,
            success: false,
            duration,
            error: error as Error
        };
    }
}

/**
 * Configuration for running all scrapers in parallel
 */
const allScrapersConfig: ScraperConfig = {
    url: '', // Not used for parallel scraping
    scrapeFunction: async () => [], // Not used for parallel scraping
    async runCustom({ writeFiles }) {
        const results: ScraperResult[] = [];
        const queue = [...SCRAPERS];
        const inProgress: Array<Promise<ScraperResult>> = [];

        if (writeFiles) {
            console.log(`Starting scrapers (max ${MAX_CONCURRENT_SCRAPERS} in parallel)...\n`);
        }

        // Process scrapers with concurrency limit
        while (queue.length > 0 || inProgress.length > 0) {
            while (inProgress.length < MAX_CONCURRENT_SCRAPERS && queue.length > 0) {
                const scraper = queue.shift()!;
                inProgress.push(executeScraper(scraper, writeFiles));
            }

            const completedResults = await Promise.all(inProgress);
            results.push(...completedResults);
            inProgress.length = 0;
        }

        if (!writeFiles) {
            // Return channels for JSON output
            return results.reduce((acc, result) => {
                if (result.success && result.channels) {
                    acc.push(...result.channels);
                }
                return acc;
            }, [] as Array<{ number: string; name: string; }>);
        } else {
            // Print summary when writing files
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

            return [];
        }
    }
};

// Execute all scrapers if this file is run directly
if (require.main === module) {
    runScraperCLI(allScrapersConfig).catch(() => process.exit(1));
} 