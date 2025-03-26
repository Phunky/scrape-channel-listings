import fs from 'fs';
import path from 'path';
import type { ScraperResult } from '../index';

const OUTPUT_DIR = '../data';

/**
 * Writes scraper results to JSON files
 * @param results Array of scraper results to write
 */
export function writeResultsToFiles(results: ScraperResult[]): void {
    const outputPath = path.join(__dirname, OUTPUT_DIR);
    fs.mkdirSync(outputPath, { recursive: true });

    results.forEach(result => {
        if (result.success && result.channels) {
            const filePath = path.join(outputPath, `${result.name.toLowerCase()}.json`);
            fs.writeFileSync(filePath, JSON.stringify(result.channels, null, 2));
        }
    });
} 