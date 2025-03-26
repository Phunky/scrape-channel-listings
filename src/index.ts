#!/usr/bin/env node

/**
 * Main entry point for the channel listing scraper.
 * This file exposes both the library API and CLI functionality.
 */

import { runScraper, type Channel, type ScraperConfig } from './utils/scraper';
import directvConfig from './scrapers/directv';
import dishConfig from './scrapers/dish';
import skyConfig from './scrapers/sky';
import virginConfig from './scrapers/virgin';
import { writeResultsToFiles } from './utils/fileUtils';
import { parseArgs } from './utils/args';

export type { Channel };

export interface ScrapingOptions {
    writeFiles?: boolean;
    maxConcurrent?: number;
}

export interface ScraperResult {
    name: string;
    success: boolean;
    duration: number;
    channelCount?: number;
    error?: Error;
    channels?: Channel[];
}

export interface ScrapingSummary {
    results: ScraperResult[];
    totalDuration: number;
    successRate: string;
    totalChannels: number;
    failedScrapers: ScraperResult[];
}

export interface ProviderChannels {
    provider: string;
    channels: Channel[];
}

const providers: Record<string, ScraperConfig> = {
    DIRECTV: directvConfig,
    DISH: dishConfig,
    SKY: skyConfig,
    Virgin: virginConfig
};

/**
 * Scrapes channel listings from all configured providers.
 * @param options Optional configuration for the scraping process
 * @returns Promise resolving to either an array of provider channels or a summary object
 */
export async function scrapeAllProviders(options?: ScrapingOptions): Promise<ProviderChannels[] | ScrapingSummary> {
    const startTime = Date.now();
    const results: ScraperResult[] = [];
    const maxConcurrent = options?.maxConcurrent || 2;

    // Process providers in batches to control concurrency
    const providerEntries = Object.entries(providers);
    for (let i = 0; i < providerEntries.length; i += maxConcurrent) {
        const batch = providerEntries.slice(i, i + maxConcurrent);
        const batchResults = await Promise.all(
            batch.map(async ([name, config]) => {
                const start = Date.now();
                try {
                    const channels = await runScraper(config);
                    return {
                        name,
                        success: true,
                        duration: Date.now() - start,
                        channelCount: channels.length,
                        channels
                    };
                } catch (error) {
                    return {
                        name,
                        success: false,
                        duration: Date.now() - start,
                        error: error as Error
                    };
                }
            })
        );
        results.push(...batchResults);
    }

    const totalDuration = Date.now() - startTime;
    const failedScrapers = results.filter(r => !r.success);
    const successRate = `${((results.length - failedScrapers.length) / results.length * 100).toFixed(1)}%`;
    const totalChannels = results.reduce((sum, r) => sum + (r.channelCount || 0), 0);

    if (options?.writeFiles) {
        return {
            results,
            totalDuration,
            successRate,
            totalChannels,
            failedScrapers
        };
    }

    // Transform results into ProviderChannels array
    return results
        .filter(result => result.success && result.channels)
        .map(result => ({
            provider: result.name,
            channels: result.channels!
        }));
}

/**
 * Scrapes channel listings from a specific provider.
 * @param providerName Name of the provider to scrape
 * @param options Optional configuration for the scraping process
 * @returns Promise resolving to a ScraperResult object
 * @throws Error if provider is not found
 */
export async function scrapeProvider(providerName: string, options?: ScrapingOptions): Promise<ScraperResult> {
    const config = providers[providerName];
    if (!config) {
        throw new Error(`Provider "${providerName}" not found`);
    }

    const start = Date.now();
    try {
        const channels = await runScraper(config);
        return {
            name: providerName,
            success: true,
            duration: Date.now() - start,
            channelCount: channels.length,
            channels
        };
    } catch (error) {
        return {
            name: providerName,
            success: false,
            duration: Date.now() - start,
            error: error as Error
        };
    }
}

// CLI functionality
if (require.main === module) {
    const args = parseArgs();
    const options: ScrapingOptions = {
        writeFiles: args.writeFiles,
        maxConcurrent: args.maxConcurrent
    };

    if (args.provider) {
        // Scrape specific provider
        scrapeProvider(args.provider, options)
            .then(result => {
                if (result.success && result.channels) {
                    if (args.writeFiles) {
                        writeResultsToFiles([result]);
                    } else {
                        console.log(JSON.stringify(result.channels, null, 2));
                    }
                } else {
                    console.error(`Failed to scrape ${args.provider}:`, result.error);
                    process.exit(1);
                }
            })
            .catch(error => {
                console.error(`Error scraping ${args.provider}:`, error);
                process.exit(1);
            });
    } else {
        // Scrape all providers
        scrapeAllProviders(options)
            .then(results => {
                if (args.writeFiles) {
                    writeResultsToFiles((results as ScrapingSummary).results);
                } else {
                    console.log(JSON.stringify(results, null, 2));
                }
            })
            .catch(error => {
                console.error('Error scraping providers:', error);
                process.exit(1);
            });
    }
} 