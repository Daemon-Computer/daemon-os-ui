/**
 * Truncates an address string to the specified number of characters at start and end
 * @param address The full address string
 * @param chars Number of characters to show at the beginning and end
 * @returns Truncated address with ellipsis in the middle
 */
export function truncateAddress(address: string, chars: number = 4): string {
    if (!address) return '';
    if (address.length <= chars * 2) return address;

    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Formats a number with thousands separators
 * @param value The number to format
 * @param decimals Number of decimal places to show
 * @returns Formatted number string
 */
export function formatNumber(value: number | string, decimals: number = 2): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return num.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}