/**
 * Virgin Media UK Channel Listing Scraper
 * Extracts channel numbers and names from Virgin Media's channel lineup
 */

import { runScraper, runScraperCLI, type ScraperConfig, type Channel } from '../utils/scraper';
import type { Page } from 'playwright';

/**
 * Extracts channel information from the Virgin Media channel listing page
 * @param page - Playwright page instance
 * @returns Array of partial channel objects containing number and name
 */
const scrapeFunction = async (page: Page): Promise<Partial<Channel>[]> => {
    return await page.$$eval('table tbody tr', (rows) => {
        return rows.map((row) => {
            // Skip regional variants (e.g., "In Wales")
            const region = row.querySelector('.column-3')?.textContent?.trim() || '';
            const number = row.querySelector('.column-1')?.textContent?.trim() || '';
            const name = row.querySelector('.column-2')?.textContent?.trim() || '';

            // Skip those with dashes in numbers as these are category definitions
            // Region variants are also skipped these start with In
            if(!name || !number || number.includes('-') || region.startsWith('In')) {
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
    'TNT SPORTS ULTIMATE': 'TNT Ultimate',
    'ITV1/STV/UTV': 'ITV1',
    'SKY CINEMA SCI-FI & HORROR HD': 'SKY CINEMA SCFI/HORROR',
    '5 HD': 'Channel5 HD',
    '5+1': 'Channel5+1',
};

/**
 * Virgin Media scraper configuration
 */
const config: ScraperConfig = {
    url: 'https://rxtvinfo.com/virgin-media-channel-list-uk/',
    scrapeFunction,
    overrides,
    outputFile: 'virgin.json'
};

// Run scraper if this file is executed directly
if (require.main === module) {
    runScraperCLI(config).catch(() => process.exit(1));
}

export default config; 