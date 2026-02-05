import { BLEPrinter, IBLEPrinter } from 'react-native-thermal-receipt-printer-image-qr';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PermissionsAndroid, Platform, Alert } from 'react-native';

const PRINTER_STORAGE_KEY = '@default_printer';

export interface PrinterDevice {
    device_name: string;
    inner_mac_address: string;
}

class PrinterService {
    private connectedPrinter: PrinterDevice | null = null;
    private isInitialized: boolean = false;

    /**
     * Initialize the BLE printer module
     */
    async init(): Promise<void> {
        if (this.isInitialized) return;

        try {
            await BLEPrinter.init();
            this.isInitialized = true;

        } catch (error) {

            throw error;
        }
    }

    /**
     * Request Bluetooth permissions (Android 12+)
     */
    async requestPermissions(): Promise<boolean> {
        if (Platform.OS !== 'android') return true;

        try {
            const granted = await PermissionsAndroid.requestMultiple([
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            ]);

            const allGranted = Object.values(granted).every(
                (status) => status === PermissionsAndroid.RESULTS.GRANTED
            );

            if (!allGranted) {

            }

            return allGranted;
        } catch (error) {

            return false;
        }
    }

    /**
     * Scan for available Bluetooth printers
     */
    async scanDevices(): Promise<PrinterDevice[]> {
        try {
            await this.init();
            const hasPermission = await this.requestPermissions();

            if (!hasPermission) {
                throw new Error('Bluetooth permissions not granted');
            }

            const devices = await BLEPrinter.getDeviceList();

            return devices as PrinterDevice[];
        } catch (error) {

            throw error;
        }
    }

    /**
     * Connect to a Bluetooth printer
     */
    async connectPrinter(macAddress: string): Promise<void> {
        try {
            await this.init();
            await BLEPrinter.connectPrinter(macAddress);

            // Find the device info from the address
            const devices = await BLEPrinter.getDeviceList();
            const device = devices.find((d: any) => d.inner_mac_address === macAddress);

            this.connectedPrinter = device ? {
                device_name: device.device_name,
                inner_mac_address: macAddress
            } : {
                device_name: 'Unknown Printer',
                inner_mac_address: macAddress
            };


        } catch (error) {

            this.connectedPrinter = null;
            throw error;
        }
    }

    /**
     * Disconnect from current printer
     */
    async disconnectPrinter(): Promise<void> {
        try {
            await BLEPrinter.closeConn();
            this.connectedPrinter = null;

        } catch (error) {

        }
    }

    /**
     * Get currently connected printer
     */
    getConnectedPrinter(): PrinterDevice | null {
        return this.connectedPrinter;
    }

    /**
     * Check if printer is connected
     */
    isConnected(): boolean {
        return this.connectedPrinter !== null;
    }

    /**
     * Save default printer to AsyncStorage
     */
    async saveDefaultPrinter(device: PrinterDevice): Promise<void> {
        try {
            await AsyncStorage.setItem(PRINTER_STORAGE_KEY, JSON.stringify(device));

        } catch (error) {

        }
    }

    /**
     * Load default printer from AsyncStorage
     */
    async loadDefaultPrinter(): Promise<PrinterDevice | null> {
        try {
            const data = await AsyncStorage.getItem(PRINTER_STORAGE_KEY);
            if (data) {
                return JSON.parse(data);
            }
            return null;
        } catch (error) {

            return null;
        }
    }

    /**
     * Auto-connect to saved default printer
     */
    async autoConnect(): Promise<boolean> {
        try {
            const defaultPrinter = await this.loadDefaultPrinter();
            if (defaultPrinter) {
                await this.connectPrinter(defaultPrinter.inner_mac_address);
                return true;
            }
            return false;
        } catch (error) {

            return false;
        }
    }

    /**
     * Print raw text using ESC/POS commands
     */
    async printText(text: string): Promise<void> {
        if (!this.connectedPrinter) {
            throw new Error('No printer connected');
        }

        try {
            await BLEPrinter.printText(text);
        } catch (error) {

            throw error;
        }
    }

    /**
     * Print receipt with ESC/POS formatting (prints 2 copies)
     */
    async printReceipt(
        order: any,
        items: any[],
        customerName: string,
        change: number,
        cashReceived: number,
        copyLabel: string = ''
    ): Promise<void> {
        if (!this.connectedPrinter) {
            throw new Error('No printer connected');
        }

        const date = new Date().toLocaleString('id-ID');
        const LINE_WIDTH = 32; // Standard 58mm thermal printer

        const center = (text: string) => {
            const padding = Math.max(0, Math.floor((LINE_WIDTH - text.length) / 2));
            return ' '.repeat(padding) + text;
        };

        const line = '-'.repeat(LINE_WIDTH);
        const doubleLine = '='.repeat(LINE_WIDTH);

        const formatPrice = (price: number) => `Rp ${price.toLocaleString('id-ID')}`;

        const leftRight = (left: string, right: string) => {
            const spaces = Math.max(1, LINE_WIDTH - left.length - right.length);
            return left + ' '.repeat(spaces) + right;
        };

        // Generate receipt content for one copy
        const generateReceipt = (copyLabel: string) => {
            let receipt = '';

            // Header
            receipt += '<C><B>KenapaKopi</B></C>\n';
            // receipt += '<C>Jl. Kopi No. 123, Jakarta</C>\n';
            receipt += '<C>Telp: 0878-3628-5577</C>\n';
            if (copyLabel) {
                receipt += `<C>${copyLabel}</C>\n`;
            }
            receipt += line + '\n';

            // Order Info
            receipt += `No: ${order.id?.slice(0, 8) || '-'}\n`;
            receipt += `Tgl: ${date}\n`;
            receipt += `Kasir: Admin\n`;
            receipt += `Pelanggan: ${customerName}\n`;
            if (order.note) {
                receipt += `Catatan: ${order.note}\n`;
            }
            receipt += line + '\n';

            // Items
            items.forEach(item => {
                const itemTotal = item.price * item.quantity;
                receipt += `${item.name}\n`;
                if (item.note) {
                    receipt += `  (${item.note})\n`;
                }
                receipt += leftRight(`  ${item.quantity} x ${formatPrice(item.price)}`, formatPrice(itemTotal)) + '\n';
            });

            receipt += line + '\n';

            // Total
            receipt += '<B>' + leftRight('TOTAL', formatPrice(order.total_amount)) + '</B>\n';

            // Payment Info
            if (order.payment_method === 'cash') {
                receipt += leftRight('Tunai', formatPrice(cashReceived)) + '\n';
                receipt += leftRight('Kembalian', formatPrice(change)) + '\n';
            } else {
                receipt += leftRight('Metode', order.payment_method?.toUpperCase() || 'QRIS') + '\n';
            }

            receipt += line + '\n';

            // Footer
            receipt += '<C>Terima Kasih!</C>\n';
            receipt += '<C>Selamat Menikmati</C>\n';
            receipt += '\n\n\n'; // Feed paper

            return receipt;
        };

        try {
            // Print Header "KenapaKopi"
            await BLEPrinter.printText('<C><B>KenapaKopi</B></C>\n');

            // Print Receipt Copy
            const receipt = generateReceipt(copyLabel);
            await BLEPrinter.printText(receipt);

        } catch (error) {

            throw error;
        }
    }

    /**
     * Print a test page
     */
    async printTestPage(): Promise<void> {
        if (!this.connectedPrinter) {
            throw new Error('No printer connected');
        }

        const testReceipt = `
<C><B>TEST PRINT</B></C>
<C>POS KenapaKopi</C>
--------------------------------
Printer: ${this.connectedPrinter.device_name}
MAC: ${this.connectedPrinter.inner_mac_address}
Time: ${new Date().toLocaleString('id-ID')}
--------------------------------
<C>Printer Berhasil Terhubung!</C>


`;

        try {
            await BLEPrinter.printText(testReceipt);

        } catch (error) {

            throw error;
        }
    }

    /**
     * Clear saved default printer
     */
    async clearDefaultPrinter(): Promise<void> {
        try {
            await AsyncStorage.removeItem(PRINTER_STORAGE_KEY);

        } catch (error) {

        }
    }
}

export const printerService = new PrinterService();
