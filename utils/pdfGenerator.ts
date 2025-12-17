
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, InvoiceTemplate } from '../types';
import { db } from '../db';

const numberToWords = (num: number): string => {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const inWords = (n: any): any => {
    n = Math.round(n);
    if (n.toString().length > 9) return 'overflow';
    let n_arr: any = ('000000000' + n).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n_arr) return '';
    let str = '';
    str += (n_arr[1] != 0) ? (a[Number(n_arr[1])] || b[n_arr[1][0]] + ' ' + a[n_arr[1][1]]) + 'Crore ' : '';
    str += (n_arr[2] != 0) ? (a[Number(n_arr[2])] || b[n_arr[2][0]] + ' ' + a[n_arr[2][1]]) + 'Lakh ' : '';
    str += (n_arr[3] != 0) ? (a[Number(n_arr[3])] || b[n_arr[3][0]] + ' ' + a[n_arr[3][1]]) + 'Thousand ' : '';
    str += (n_arr[4] != 0) ? (a[Number(n_arr[4])] || b[n_arr[4][0]] + ' ' + a[n_arr[4][1]]) + 'Hundred ' : '';
    str += (n_arr[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n_arr[5])] || b[n_arr[5][0]] + ' ' + a[n_arr[5][1]]) + 'Only ' : 'Only';
    return str;
  };
  return inWords(num);
};

export const generateInvoicePDF = async (invoice: Invoice, template: InvoiceTemplate = 'authentic') => {
  const profile = await db.settings.get(1);
  const companyName = profile?.companyName || 'GOPI DISTRIBUTOR';
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Header 
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(`GSTIN No. ${profile?.gstin || ''}`, 10, 10);
  doc.text("TAX INVOICE", pageWidth / 2, 10, { align: 'center' });
  doc.text("Duplicate Copy", pageWidth - 10, 10, { align: 'right' });
  
  doc.setLineWidth(0.1);
  doc.line(10, 12, pageWidth - 10, 12);
  
  // Center Info
  doc.setFontSize(18);
  doc.text(companyName, pageWidth / 2, 22, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(profile?.addressLine1 || '', pageWidth / 2, 28, { align: 'center' });
  doc.text(profile?.addressLine2 || '', pageWidth / 2, 33, { align: 'center' });
  
  const dlStr = [profile?.dlNo1, profile?.dlNo2].filter(Boolean).map(s => `(${s})`).join(' ');
  doc.setFontSize(7);
  doc.text(dlStr, pageWidth / 2, 38, { align: 'center' });

  // Contact/Terms Right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(profile?.phone || '', pageWidth - 12, 22, { align: 'right' });
  doc.text("TERMS: Credit", pageWidth - 12, 38, { align: 'right' });

  doc.line(10, 42, pageWidth - 10, 42);

  // Meta Box
  doc.rect(10, 44, 110, 32); 
  doc.rect(120, 44, 80, 8); 
  doc.rect(120, 52, 80, 8); 
  doc.rect(120, 60, 80, 8); 
  doc.rect(120, 68, 80, 8); 

  doc.setFontSize(8);
  doc.text("Purchaser's Name and Address", 12, 48);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(invoice.partyName, 12, 53);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(invoice.partyAddress || '', 12, 58, { maxWidth: 100 });
  doc.text(`GSTIN - ${invoice.partyGstin || ''}`, 12, 72);

  doc.text(`INVOICE NO. ${invoice.invoiceNo}`, 122, 50);
  doc.text(`DATE: ${new Date(invoice.date).toLocaleDateString()}`, pageWidth - 12, 50, { align: 'right' });
  doc.text(`GR No. ${invoice.grNo || ''}`, 122, 58);
  doc.text(`Vehicle No. ${invoice.vehicleNo || ''}`, 122, 66);
  doc.text(`TRANSPORT: ${invoice.transport || ''}`, 122, 74);

  // Table
  const head = [["S.N", "ITEM DESCRIPTION", "Batch", "Exp", "HSN", "OLD\nMRP", "NEW\nMRP", "QTY", "Fr.\nQty", "RATE", "Value", "Disc\n%", "Taxable\nAmt.", "SGST\nAmt", "CGST\nAmt", "TOTAL"]];
  const body = invoice.items.map((it, idx) => [
    idx + 1,
    it.name,
    it.batch,
    it.expiry,
    it.hsn,
    it.oldMrp || it.mrp,
    it.mrp,
    it.quantity,
    it.freeQuantity || '0',
    it.saleRate.toFixed(2),
    (it.saleRate * it.quantity).toFixed(2),
    it.discountPercent,
    it.taxableValue.toFixed(2),
    it.sgstAmount.toFixed(2),
    it.cgstAmount.toFixed(2),
    it.totalAmount.toFixed(2)
  ]);

  autoTable(doc, {
    head: head,
    body: body,
    startY: 80,
    theme: 'grid',
    styles: { fontSize: 6, cellPadding: 1, halign: 'center', lineWidth: 0.1, lineColor: 0 },
    headStyles: { fillColor: 255, textColor: 0, fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'left', cellWidth: 35 } }
  });

  const finalY = (doc as any).lastAutoTable.finalY;

  // Footer Calculation
  doc.setFontSize(7);
  const summaryY = finalY + 5;
  
  // HSN Summary
  const hsnMap = invoice.items.reduce((acc: any, it) => {
    if(!acc[it.hsn]) acc[it.hsn] = { hsn: it.hsn, taxable: 0, tax: 0 };
    acc[it.hsn].taxable += it.taxableValue;
    acc[it.hsn].tax += (it.sgstAmount + it.cgstAmount);
    return acc;
  }, {});
  
  let currentHsnY = summaryY;
  doc.setFont("helvetica", "bold");
  doc.text("HSN/SAC      Taxable       GST Amt", 10, currentHsnY);
  doc.setFont("helvetica", "normal");
  Object.values(hsnMap).forEach((h: any) => {
    currentHsnY += 4;
    doc.text(`${h.hsn}        ${h.taxable.toFixed(2)}       ${h.tax.toFixed(2)}`, 10, currentHsnY);
  });

  // Totals Right
  const totalsX = 135;
  doc.text("Total Amount Before Tax:", totalsX, summaryY + 4);
  doc.text(invoice.totalTaxable.toFixed(2), pageWidth - 10, summaryY + 4, { align: 'right' });
  
  doc.text("Add: SGST:", totalsX, summaryY + 8);
  doc.text(invoice.totalSGST.toFixed(2), pageWidth - 10, summaryY + 8, { align: 'right' });
  
  doc.text("Add: CGST:", totalsX, summaryY + 12);
  doc.text(invoice.totalCGST.toFixed(2), pageWidth - 10, summaryY + 12, { align: 'right' });

  doc.line(totalsX, summaryY + 15, pageWidth - 10, summaryY + 15);
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("GRAND TOTAL", totalsX, summaryY + 22);
  doc.text(Math.round(invoice.grandTotal).toFixed(2), pageWidth - 10, summaryY + 22, { align: 'right' });

  // Words
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`Bill Amount In Words : Rupees ${numberToWords(invoice.grandTotal)}`, 10, summaryY + 35);

  // Signs
  doc.text("Terms & Conditions:", 10, summaryY + 50);
  doc.text(profile?.terms || "", 10, summaryY + 55, { maxWidth: 100 });
  
  doc.setFont("helvetica", "bold");
  doc.text(`For ${companyName}`, pageWidth - 15, summaryY + 55, { align: 'right' });
  doc.text("Auth. Signatory", pageWidth - 15, summaryY + 75, { align: 'right' });

  doc.save(`${invoice.invoiceNo}.pdf`);
};
