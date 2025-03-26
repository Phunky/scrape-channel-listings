/**
 * Sky UK Channel Listing Scraper
 * Extracts channel numbers and names from Sky's channel lineup
 */

import { runScraper, runScraperCLI, type ScraperConfig, type Channel } from '../utils/scraper';
import type { Page } from 'playwright';

/**
 * Extracts channel information from the Sky channel listing page
 * @param page - Playwright page instance
 * @returns Array of partial channel objects containing number and name
 */
const scrapeFunction = async (page: Page): Promise<Partial<Channel>[]> => {
    return await page.$$eval('table tbody tr', (rows) => {
        return rows.map((row) => {
            const number = row.querySelector('.column-1')?.textContent?.trim() || '';
            const name = row.querySelector('.column-2')?.textContent?.trim() || '';

            // Skip those with dashes in numbers as these are category definitions
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
    'DISC. SCIENCE': 'Discovery Science',
    'DISC. TURBO': 'Discovery Turbo',
    'SKY CINEMA SCI-FI/HORROR': 'SKY CINEMA SCFI/HORROR',
    'RTÉjr': 'RTE Junior',
    '5': 'Channel5',
    '5+1': 'Channel5+1',
};

/**
 * Sky UK scraper configuration
 */
const config: ScraperConfig = {
    url: 'https://rxtvinfo.com/sky-channel-list-uk/',
    scrapeFunction,
    overrides,
    outputFile: 'sky.json'
};

// Run scraper if this file is executed directly
if (require.main === module) {
    runScraperCLI(config).catch(() => process.exit(1));
}

export default config; 