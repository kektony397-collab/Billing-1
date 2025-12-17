import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, CompanyProfile } from '../types';
import { db } from '../db';

const numberToWords = (num: number): string => {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const inWords = (n: number): string => {
    if (n === 0) return 'Zero';
    let str = '';
    if (n >= 10000000) {
      str += inWords(Math.floor(n / 10000000)) + 'Crore ';
      n %= 10000000;
    }
    if (n >= 100000) {
      str += inWords(Math.floor(n / 100000)) + 'Lakh ';
      n %= 100000;
    }
    if (n >= 1000) {
      str += inWords(Math.floor(n / 1000)) + 'Thousand ';
      n %= 1000;
    }
    if (n >= 100) {
      str += inWords(Math.floor(n / 100)) + 'Hundred ';
      n %= 100;
    }
    if (n > 0) {
      if (str !== '') str += 'and ';
      if (n < 20) str += a[n];
      else {
        str += b[Math.floor(n / 10)];
        if (n % 10 > 0) str += '-' + a[n % 10];
      }
    }
    return str;
  };

  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);
  
  let result = 'Rupees ' + inWords(integerPart);
  if (decimalPart > 0) {
    result += 'and ' + inWords(decimalPart) + 'Paise ';
  }
  return result + 'Only';
};

export const generateInvoicePDF = async (invoice: Invoice, template: string = 'standard') => {
  const profile = await db.settings.get(1);
  if (!profile) return;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(profile.companyName, pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(profile.addressLine1, pageWidth / 2, 22, { align: 'center' });
  doc.text(profile.addressLine2, pageWidth / 2, 27, { align: 'center' });
  
  doc.setFont('helvetica', 'bold');
  doc.text(`GSTIN: ${profile.gstin}`, pageWidth / 2, 33, { align: 'center' });
  
  // Drug Licenses
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const dlText1 = `D.L. No: ${profile.dlNo1 || ''}, ${profile.dlNo2 || ''}`;
  const dlText2 = `${profile.dlNo3 || ''}, ${profile.dlNo4 || ''}`;
  doc.text(dlText1, pageWidth / 2, 38, { align: 'center' });
  doc.text(dlText2, pageWidth / 2, 42, { align: 'center' });

  doc.setLineWidth(0.5);
  doc.line(10, 45, pageWidth - 10, 45);

  // Bill To / Details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', 14, 52);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.partyName, 14, 57);
  doc.setFontSize(9);
  doc.text(invoice.partyAddress || '', 14, 62, { maxWidth: 100 });
  doc.text(`GSTIN: ${invoice.partyGstin || 'N/A'}`, 14, 72);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Invoice No: ${invoice.invoiceNo}`, pageWidth - 14, 52, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${new Date(invoice.date).toLocaleDateString()}`, pageWidth - 14, 57, { align: 'right' });
  if (invoice.vehicleNo) doc.text(`Vehicle No: ${invoice.vehicleNo}`, pageWidth - 14, 62, { align: 'right' });
  if (invoice.grNo) doc.text(`GR No: ${invoice.grNo}`, pageWidth - 14, 67, { align: 'right' });

  // Table
  const tableData = invoice.items.map((item, index) => [
    index + 1,
    item.name,
    item.hsn,
    item.batch,
    item.expiry,
    item.quantity,
    item.mrp.toFixed(2),
    item.saleRate.toFixed(2),
    item.discountPercent + '%',
    item.gstRate + '%',
    item.totalAmount.toFixed(2)
  ]);

  autoTable(doc, {
    startY: 80,
    head: [['Sr.', 'Description', 'HSN', 'Batch', 'Exp', 'Qty', 'MRP', 'Rate', 'Disc', 'GST', 'Amount']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 'auto' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
      10: { halign: 'right' }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY || 150;

  // Summary
  doc.setFontSize(10);
  const summaryX = pageWidth - 60;
  doc.text(`Taxable Value:`, summaryX, finalY + 10);
  doc.text(`₹${invoice.totalTaxable.toFixed(2)}`, pageWidth - 14, finalY + 10, { align: 'right' });

  if (invoice.totalIGST > 0) {
    doc.text(`IGST:`, summaryX, finalY + 15);
    doc.text(`₹${invoice.totalIGST.toFixed(2)}`, pageWidth - 14, finalY + 15, { align: 'right' });
  } else {
    doc.text(`CGST:`, summaryX, finalY + 15);
    doc.text(`₹${invoice.totalCGST.toFixed(2)}`, pageWidth - 14, finalY + 15, { align: 'right' });
    doc.text(`SGST:`, summaryX, finalY + 20);
    doc.text(`₹${invoice.totalSGST.toFixed(2)}`, pageWidth - 14, finalY + 20, { align: 'right' });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Grand Total:`, summaryX, finalY + 30);
  doc.text(`₹${invoice.grandTotal.toFixed(2)}`, pageWidth - 14, finalY + 30, { align: 'right' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text(numberToWords(invoice.grandTotal), 14, finalY + 30);

  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Terms & Conditions:', 14, finalY + 45);
  doc.text(profile.terms || '', 14, finalY + 50, { maxWidth: 100 });

  doc.setFont('helvetica', 'bold');
  doc.text(`For ${profile.companyName}`, pageWidth - 14, finalY + 60, { align: 'right' });
  doc.text('Authorized Signatory', pageWidth - 14, finalY + 80, { align: 'right' });

  doc.save(`Invoice_${invoice.invoiceNo}.pdf`);
};