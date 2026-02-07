export const formatRupiah = (value: string | number, prefix: string = 'Rp '): string => {
    if (value === '' || value === null || value === undefined) return '';

    const numberString = typeof value === 'number' ? value.toString() : value.replace(/[^,\d]/g, '').toString();
    const split = numberString.split(',');
    const sisa = split[0].length % 3;
    let rupiah = split[0].substr(0, sisa);
    const ribuan = split[0].substr(sisa).match(/\d{3}/gi);

    if (ribuan) {
        const separator = sisa ? '.' : '';
        rupiah += separator + ribuan.join('.');
    }

    rupiah = split[1] !== undefined ? rupiah + ',' + split[1] : rupiah;
    return prefix + rupiah;
};

export const parseRupiah = (formatted: string): number => {
    if (!formatted) return 0;
    // Remove all dots first (thousands separators)
    const withoutDots = formatted.replace(/\./g, '');
    // Replace comma with dot (decimal separator)
    const withDecimalDot = withoutDots.replace(',', '.');
    // Keep only digits, dot, and minus
    const cleanNumber = withDecimalDot.replace(/[^0-9.-]/g, '');
    return parseFloat(cleanNumber) || 0;
};
