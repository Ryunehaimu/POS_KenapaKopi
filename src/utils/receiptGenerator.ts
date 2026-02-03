
import { Order } from '../services/orderService';
import { CartItemType } from '../components/cashier/CartItem'; // Adjust import if needed or redefine

export const generateReceiptHtml = (order: any, items: any[], customerName: string, change: number, cashReceived: number) => {
    const date = new Date().toLocaleString('id-ID');

    let itemsHtml = '';
    items.forEach(item => {
        itemsHtml += `
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="flex: 2; font-size: 12px;">${item.name} x${item.quantity}</span>
                <span style="flex: 1; text-align: right; font-size: 12px;">Rp ${(item.price * item.quantity).toLocaleString()}</span>
            </div>
        `;
    });

    return `
        <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            </head>
            <body style="font-family: 'Courier New', Courier, monospace; width: 100%; max-width: 300px; margin: 0 auto; padding: 10px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="margin: 0;">POS KenapaKopi</h2>
                    <p style="margin: 5px 0; font-size: 12px;">Jl. Kopi No. 123, Jakarta</p>
                    <p style="margin: 5px 0; font-size: 12px;">Telp: 0812-3456-7890</p>
                </div>
                
                <div style="margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px;">
                    <p style="margin: 2px 0; font-size: 12px;">No. Order: ${order.id?.slice(0, 8)}</p>
                    <p style="margin: 2px 0; font-size: 12px;">Tgl: ${date}</p>
                    <p style="margin: 2px 0; font-size: 12px;">Kasir: Admin</p>
                    <p style="margin: 2px 0; font-size: 12px;">Pelanggan: ${customerName}</p>
                </div>

                <div style="margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px;">
                    ${itemsHtml}
                </div>

                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="font-weight: bold; font-size: 14px;">Total</span>
                    <span style="font-weight: bold; font-size: 14px;">Rp ${order.total_amount.toLocaleString()}</span>
                </div>
                
                 ${order.payment_method === 'cash' ? `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span style="font-size: 12px;">Tunai</span>
                        <span style="font-size: 12px;">Rp ${cashReceived.toLocaleString()}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span style="font-size: 12px;">Kembalian</span>
                        <span style="font-size: 12px;">Rp ${change.toLocaleString()}</span>
                    </div>
                ` : `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span style="font-size: 12px;">Metode</span>
                        <span style="font-size: 12px;">${order.payment_method.toUpperCase()}</span>
                    </div>
                `}

                <div style="text-align: center; margin-top: 20px; font-size: 12px;">
                    <p>Terima Kasih!</p>
                </div>
            </body>
        </html>
    `;
};
