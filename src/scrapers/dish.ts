/**
 * DISH Network Channel Listing Scraper
 * Extracts channel numbers and names from DISH's channel lineup
 */

import { runScraper, runScraperCLI, type ScraperConfig, type Channel } from '../utils/scraper';
import type { Page } from 'playwright';

/**
 * Extracts channel information from the DISH channel listing page
 * @param page - Playwright page instance
 * @returns Array of partial channel objects containing number and name
 */
const scrapeFunction = async (page: Page): Promise<Partial<Channel>[]> => {
    return await page.$$eval('#dish-channel-guide tbody tr', (rows) => {
        return rows.map((row) => {
            const number = row.querySelector('td.column-2')?.textContent?.trim() || '';
            const name = row.querySelector('td.column-1')?.textContent?.trim() || '';

            if (!name || number.includes('-')) {
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
    'NICK': 'NICKELODEON'
};

/**
 * DISH Network scraper configuration
 */
const config: ScraperConfig = {
    url: 'https://www.allconnect.com/providers/dish/channel-guide',
    scrapeFunction,
    overrides,
    outputFile: 'dish.json'
};

// Run scraper if this file is executed directly
if (require.main === module) {
    runScraperCLI(config).catch(() => process.exit(1));
}

export default config; 