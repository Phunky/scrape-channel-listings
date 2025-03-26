/**
 * DIRECTV Channel Listing Scraper
 * Extracts channel numbers and names from DIRECTV's channel lineup
 */

import { runScraper, runScraperCLI, type ScraperConfig, type Channel } from '../utils/scraper';
import type { Page } from 'playwright';

/**
 * Extracts channel information from the DIRECTV channel listing page
 * @param page - Playwright page instance
 * @returns Array of partial channel objects containing number and name
 */
const scrapeFunction = async (page: Page): Promise<Partial<Channel>[]> => {
    return await page.$$eval('table tr', (rows) => {
        // Skip header row and process each channel row
        return rows.slice(1).map((row) => {
            const number = row.querySelector('td:nth-child(2)')?.textContent?.trim() || '';
            const name = row.querySelector('td:nth-child(1)')?.textContent?.trim() || '';

            if (!name || !number || number.includes('-')) {
                return {};
            }

            return { number, name };
        });
    });
};

/**
 * Channel name overrides to standardize naming across providers
 */
const overrides: Record<string, string> = {
    'CHEDDAR NEWS8': 'CHEDDAR NEWS',
    'DIRECTV 4K 1': 'DIRECTV 4K',
    'DIRECTV 4K LIVE 1': 'DIRECTV 4K LIVE',
    'DIRECTV 4K LIVE 2 1': 'DIRECTV 4K LIVE 2',
};

/**
 * DIRECTV scraper configuration
 */
const config: ScraperConfig = {
    url: 'https://www.usdirect.com/channels',
    scrapeFunction,
    overrides,
    excludeChannels: (channel) => !channel.name || !channel.number || channel.number.includes('-'),
    outputFile: 'directv.json'
};

// Run scraper if this file is executed directly
if (require.main === module) {
    runScraperCLI(config).catch(() => process.exit(1));
}

export default config; 