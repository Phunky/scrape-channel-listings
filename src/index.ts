/**
 * Main entry point for the channel listing scraper
 * Exposes both library API and CLI functionality
 */

import { runScraper, runScraperCLI, type ScraperConfig } from './utils/scraper';
import directvConfig from './scrapers/directv';
import dishConfig from './scrapers/dish';
import skyConfig from './scrapers/sky';
import virginConfig from './scrapers/virgin';

export interface Channel {
    number: string;
    name: string;
}

export interface ScraperDefinition {
    name: string;
    config: typeof directvConfig;
}

export interface ScraperResult {
    name: string;
    success: boolean;
    duration: number;
    channelCount?: number;
    error?: Error;
    channels?: Channel[];
}

export interface ScrapingOptions {
    writeFiles?: boolean;
    maxConcurrent?: number;
}

export interface ScrapingSummary {
    results: ScraperResult[];
    totalDuration: number;
    successRate: string;
    totalChannels: number;
    failedScrapers: ScraperResult[];
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
 * Scrapes channel listings from all configured providers
 * @param options Configuration options for the scraping process
 * @returns Promise resolving to either a summary object or array of channels
 */
export async function scrapeAllProviders(options: ScrapingOptions = {}): Promise<ScrapingSummary | Channel[]> {
    const { writeFiles = false, maxConcurrent = 4 } = options;
    const results: ScraperResult[] = [];
    const queue = [...SCRAPERS];
    const inProgress: Array<Promise<ScraperResult>> = [];

    if (writeFiles) {
        console.log(`Starting scrapers (max ${maxConcurrent} in parallel)...\n`);
    }

    // Process scrapers with concurrency limit
    while (queue.length > 0 || inProgress.length > 0) {
        while (inProgress.length < maxConcurrent && queue.length > 0) {
            const scraper = queue.shift()!;
            inProgress.push(executeScraper(scraper, writeFiles));
        }

        const completedResults = await Promise.all(inProgress);
        results.push(...completedResults);
        inProgress.length = 0;
    }

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    const totalChannels = successful.reduce((sum, r) => sum + (r.channelCount || 0), 0);

    if (!writeFiles) {
        // Return channels for JSON output
        return results.reduce((acc, result) => {
            if (result.success && result.channels) {
                acc.push(...result.channels);
            }
            return acc;
        }, [] as Channel[]);
    } else {
        // Print summary when writing files
        console.log('\nScraping Summary:');
        console.log('----------------');
        console.log(`Total Duration: ${totalDuration}ms`);
        console.log(`Success Rate: ${successful.length}/${results.length}`);
        console.log(`Total Channels: ${totalChannels}`);
        
        if (failed.length > 0) {
            console.log('\nFailed Scrapers:');
            failed.forEach(result => {
                console.log(`- ${result.name}: ${result.error?.message}`);
            });
        }

        return {
            results,
            totalDuration,
            successRate: `${successful.length}/${results.length}`,
            totalChannels,
            failedScrapers: failed
        };
    }
}

/**
 * Scrapes channel listings from a specific provider
 * @param providerName Name of the provider to scrape
 * @param options Configuration options for the scraping process
 * @returns Promise resolving to the scraper result
 */
export async function scrapeProvider(providerName: string, options: ScrapingOptions = {}): Promise<ScraperResult> {
    const scraper = SCRAPERS.find(s => s.name.toLowerCase() === providerName.toLowerCase());
    if (!scraper) {
        throw new Error(`Provider "${providerName}" not found. Available providers: ${SCRAPERS.map(s => s.name).join(', ')}`);
    }
    return executeScraper(scraper, options.writeFiles || false);
}

// Execute all scrapers if this file is run directly
if (require.main === module) {
    runScraperCLI({
        url: '', // Not used for parallel scraping
        scrapeFunction: async () => [], // Not used for parallel scraping
        async runCustom({ writeFiles }) {
            const result = await scrapeAllProviders({ writeFiles });
            if (writeFiles && 'failedScrapers' in result && result.failedScrapers.length > 0) {
                process.exit(1);
            }
            return [];
        }
    }).catch(() => process.exit(1));
} 