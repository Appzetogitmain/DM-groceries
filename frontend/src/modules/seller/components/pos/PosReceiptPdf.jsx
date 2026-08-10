import React from 'react';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';

export const generatePosReceiptPdf = (order) => {
    try {
        // Create standard thermal receipt width (80mm) with dynamic height based on items
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [80, 200 + (order.items?.length || 0) * 10]
        });

        // Set font
        doc.setFont('helvetica', 'normal');
        
        let yPos = 10;
        const center = 40;
        const left = 5;
        const right = 75;
        
        // Header
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(order.address?.address || 'DM Groceries', center, yPos, { align: 'center' });
        
        yPos += 6;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('POS Receipt', center, yPos, { align: 'center' });
        
        yPos += 8;
        doc.setFontSize(9);
        doc.text(`Receipt #: ${order.posMetadata?.receiptNumber || order.orderId}`, left, yPos);
        
        yPos += 5;
        const date = new Date(order.createdAt || Date.now());
        doc.text(`Date: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`, left, yPos);
        
        if (order.posMetadata?.walkInCustomerName) {
            yPos += 5;
            doc.text(`Customer: ${order.posMetadata.walkInCustomerName}`, left, yPos);
            if (order.posMetadata?.walkInCustomerPhone) {
                yPos += 5;
                doc.text(`Phone: ${order.posMetadata.walkInCustomerPhone}`, left, yPos);
            }
        }
        
        yPos += 5;
        doc.text('------------------------------------------------', left, yPos);
        
        // Items Header
        yPos += 5;
        doc.text('Item', left, yPos);
        doc.text('Qty', 45, yPos);
        doc.text('Price', 55, yPos);
        doc.text('Total', right, yPos, { align: 'right' });
        
        yPos += 3;
        doc.text('------------------------------------------------', left, yPos);
        
        // Items
        yPos += 5;
        (order.items || []).forEach(item => {
            // Check if name is too long and truncate
            const name = item.name.length > 18 ? item.name.substring(0, 16) + '..' : item.name;
            doc.text(name, left, yPos);
            doc.text(String(item.quantity), 45, yPos);
            doc.text(String(item.price), 55, yPos);
            doc.text(String((item.price * item.quantity).toFixed(2)), right, yPos, { align: 'right' });
            yPos += 5;
        });
        
        doc.text('------------------------------------------------', left, yPos);
        
        // Totals
        yPos += 5;
        doc.text('Subtotal:', 40, yPos);
        doc.text(String(order.paymentBreakdown?.productSubtotal?.toFixed(2) || '0.00'), right, yPos, { align: 'right' });
        
        if (order.paymentBreakdown?.discountTotal > 0) {
            yPos += 5;
            doc.text('Discount:', 40, yPos);
            doc.text(`-${order.paymentBreakdown.discountTotal.toFixed(2)}`, right, yPos, { align: 'right' });
        }
        
        yPos += 5;
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL:', 40, yPos);
        doc.text(String(order.paymentBreakdown?.grandTotal?.toFixed(2) || '0.00'), right, yPos, { align: 'right' });
        
        doc.setFont('helvetica', 'normal');
        yPos += 5;
        doc.text(`Paid via: ${order.paymentMode}`, 40, yPos);
        
        // Cash details if applicable
        if (order.paymentMode === 'CASH' || order.paymentMode === 'MIXED') {
            yPos += 5;
            doc.text('Cash Rcvd:', 40, yPos);
            doc.text(String(order.posMetadata?.cashReceived?.toFixed(2) || '0.00'), right, yPos, { align: 'right' });
            
            yPos += 5;
            doc.text('Change:', 40, yPos);
            doc.text(String(order.posMetadata?.changeReturned?.toFixed(2) || '0.00'), right, yPos, { align: 'right' });
        }
        
        yPos += 10;
        doc.text('Thank you for shopping with us!', center, yPos, { align: 'center' });
        
        // Output
        const filename = `Receipt_${order.posMetadata?.receiptNumber || order.orderId}.pdf`;
        doc.save(filename);
        toast.success('Receipt downloaded successfully');
        
    } catch (error) {
        console.error('PDF Generation error:', error);
        toast.error('Failed to generate receipt PDF');
    }
};

const PosReceiptPdf = () => {
    return null; // This is just a utility file exposing the function
};

export default PosReceiptPdf;
