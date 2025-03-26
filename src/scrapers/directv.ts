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
            let number = row.querySelector('td:nth-child(2)')?.textContent?.trim() || '';
            const name = row.querySelector('td:nth-child(1)')?.textContent?.trim() || '';

            // Handle timeshift channels, they use the same number but the website displays the timeshift with them.
            if (number.includes('-')) {
                number = number.split('-')[0];
            }

            // Handle channels with commas, these have multiple numbers but we only want the first one.
            if (number.includes(',')) {
                number = number.split(',')[0];
            }

            if (!name || !number) {
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
    outputFile: 'directv.json'
};

// Run scraper if this file is executed directly
if (require.main === module) {
    runScraperCLI(config).catch(() => process.exit(1));
}

export default config; 