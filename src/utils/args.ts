interface Args {
    provider?: string;
    writeFiles: boolean;
    maxConcurrent?: number;
}

/**
 * Parses command line arguments
 * @returns Parsed arguments object
 */
export function parseArgs(): Args {
    const args: Args = {
        writeFiles: false
    };

    for (let i = 2; i < process.argv.length; i++) {
        const arg = process.argv[i];
        if (arg === '--provider' && i + 1 < process.argv.length) {
            args.provider = process.argv[++i];
        } else if (arg === '--write-files') {
            args.writeFiles = true;
        } else if (arg === '--max-concurrent' && i + 1 < process.argv.length) {
            args.maxConcurrent = parseInt(process.argv[++i], 10);
        }
    }

    return args;
} 