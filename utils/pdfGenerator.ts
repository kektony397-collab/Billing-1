import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, InvoiceTemplate } from '../types';
import { db } from '../db';

const numberToWords = (num: number): string => {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const inWords = (n: any): any => {
    if ((n = n.toString()).length > 9) return 'overflow';
    let n_arr: any = ('000000000' + n).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n_arr) return;
    let str = '';
    str += (n_arr[1] != 0) ? (a[Number(n_arr[1])] || b[n_arr[1][0]] + ' ' + a[n_arr[1][1]]) + 'Crore ' : '';
    str += (n_arr[2] != 0) ? (a[Number(n_arr[2])] || b[n_arr[2][0]] + ' ' + a[n_arr[2][1]]) + 'Lakh ' : '';
    str += (n_arr[3] != 0) ? (a[Number(n_arr[3])] || b[n_arr[3][0]] + ' ' + a[n_arr[3][1]]) + 'Thousand ' : '';
    str += (n_arr[4] != 0) ? (a[Number(n_arr[4])] || b[n_arr[4][0]] + ' ' + a[n_arr[4][1]]) + 'Hundred ' : '';
    str += (n_arr[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n_arr[5])] || b[n_arr[5][0]] + ' ' + a[n_arr[5][1]]) + 'Only ' : 'Only';
    return str;
  };
  return inWords(Math.round(num));
};

export const generateInvoicePDF = async (invoice: Invoice, template: InvoiceTemplate = 'authentic') => {
  const profile = await db.settings.get(1);
  const companyName = profile?.companyName || 'GOPI DISTRIBUTOR';
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  if (template === 'authentic') {
    // AUTHENTIC DESIGN (REPLICATING THE IMAGE)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(`GSTIN No. ${profile?.gstin || ''}`, 10, 10);
    doc.text("TAX INVOICE", pageWidth / 2, 10, { align: 'center' });
    doc.text("Duplicate Copy", pageWidth - 10, 10, { align: 'right' });
    
    doc.line(10, 12, pageWidth - 10, 12);
    
    // Brand Center
    doc.setFontSize(18);
    doc.text(companyName.toUpperCase(), pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(profile?.addressLine1 || '', pageWidth / 2, 25, { align: 'center' });
    doc.text(profile?.addressLine2 || '', pageWidth / 2, 30, { align: 'center' });
    
    const dlText = [profile?.dlNo1 ? `(${profile.dlNo1})` : '', profile?.dlNo2 ? `(${profile.dlNo2})` : ''].filter(Boolean).join(' ');
    doc.text(dlText, pageWidth / 2, 35, { align: 'center' });

    // Contact Box
    doc.setFont("helvetica", "bold");
    doc.text(profile?.phone || '', pageWidth - 15, 20, { align: 'right' });
    doc.text("TERMS :  Credit", pageWidth - 15, 35, { align: 'right' });

    doc.line(10, 40, pageWidth - 10, 40);

    // Header Meta Boxes
    doc.rect(10, 42, 110, 30); // Purchaser
    doc.rect(120, 42, 80, 10); // Inv No
    doc.rect(120, 52, 80, 10); // GR No
    doc.rect(120, 62, 80, 10); // Vehicle

    doc.setFontSize(8);
    doc.text("Purchaser's Name and Address", 12, 45);
    doc.setFontSize(9);
    doc.text(invoice.partyName, 12, 50);
    doc.setFontSize(8);
    doc.text(invoice.partyAddress || '', 12, 55);
    doc.text(`GSTIN - ${invoice.partyGstin || ''}`, 12, 65);

    doc.text(`INVOICE NO. ${invoice.invoiceNo}`, 122, 48);
    doc.text(`DATE: ${new Date(invoice.date).toLocaleDateString()}`, pageWidth - 12, 48, { align: 'right' });
    doc.text(`GR No. ${invoice.grNo || ''}`, 122, 58);
    doc.text(`Vehicle No. ${invoice.vehicleNo || ''}`, 122, 68);

    // Item Table
    const tableHeaders = [["S.N", "ITEM\nDESCRIPTION", "Batch", "Exp", "HSN\nCODE", "OLD\nM.R.P", "NEW\nM.R.P", "QTY", "Fr.\nQty", "RATE", "Total\nValue", "Disc\n%", "Taxable\nAmt.", "SGST\n%", "SGST\nAmt", "CGST\n%", "CGST\nAmt", "TOTAL"]];
    const tableData = invoice.items.map((it, idx) => [
      idx + 1,
      it.name,
      it.batch,
      it.expiry,
      it.hsn,
      it.oldMrp || '',
      it.mrp,
      it.quantity,
      it.freeQuantity || '0',
      it.saleRate.toFixed(2),
      (it.saleRate * it.quantity).toFixed(2),
      it.discountPercent,
      it.taxableValue.toFixed(2),
      it.gstRate / 2,
      it.sgstAmount.toFixed(2),
      it.gstRate / 2,
      it.cgstAmount.toFixed(2),
      it.totalAmount.toFixed(2)
    ]);

    autoTable(doc, {
      head: tableHeaders,
      body: tableData,
      startY: 75,
      theme: 'grid',
      styles: { fontSize: 6, cellPadding: 1, halign: 'center', lineWidth: 0.1, lineColor: [0, 0, 0] },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'left', cellWidth: 30 } }
    });

    const finalY = (doc as any).lastAutoTable.finalY;

    // Footer Summary
    doc.setFontSize(7);
    const summaryStartY = finalY + 5;
    
    // HSN Summary Table
    const hsnHeaders = [["HSN/SAC", "Taxable", "SGST %", "Amt.", "CGST %", "Amt."]];
    const hsnData = Object.values(invoice.items.reduce((acc: any, it) => {
      if(!acc[it.hsn]) acc[it.hsn] = { hsn: it.hsn, taxable: 0, sgstP: it.gstRate/2, sgstA: 0, cgstP: it.gstRate/2, cgstA: 0 };
      acc[it.hsn].taxable += it.taxableValue;
      acc[it.hsn].sgstA += it.sgstAmount;
      acc[it.hsn].cgstA += it.cgstAmount;
      return acc;
    }, {})).map((v: any) => [v.hsn, v.taxable.toFixed(2), v.sgstP, v.sgstA.toFixed(2), v.cgstP, v.cgstA.toFixed(2)]);

    autoTable(doc, {
      head: hsnHeaders,
      body: hsnData,
      startY: summaryStartY,
      margin: { left: 10, right: 100 },
      theme: 'plain',
      styles: { fontSize: 6, cellPadding: 0.5 },
      headStyles: { fontStyle: 'bold' }
    });

    // Totals Column
    const totalsX = 130;
    doc.setFont("helvetica", "normal");
    doc.text("Total Amount Before Tax", totalsX, summaryStartY + 5);
    doc.text(invoice.totalTaxable.toFixed(2), pageWidth - 10, summaryStartY + 5, { align: 'right' });
    
    doc.text(`Add: SGST`, totalsX, summaryStartY + 10);
    doc.text(invoice.totalSGST.toFixed(2), pageWidth - 10, summaryStartY + 10, { align: 'right' });
    
    doc.text(`Add: CGST`, totalsX, summaryStartY + 15);
    doc.text(invoice.totalCGST.toFixed(2), pageWidth - 10, summaryStartY + 15, { align: 'right' });

    doc.line(totalsX, summaryStartY + 18, pageWidth - 10, summaryStartY + 18);
    
    doc.setFont("helvetica", "bold");
    doc.text("GRAND TOTAL", totalsX, summaryStartY + 23);
    doc.setFontSize(12);
    doc.text(Math.round(invoice.grandTotal).toFixed(2), pageWidth - 10, summaryStartY + 23, { align: 'right' });

    // Amount in words
    doc.setFontSize(7);
    doc.text(`Bill Amount In Words : Rupees ${numberToWords(invoice.grandTotal)}`, 10, summaryStartY + 35);
    doc.text(`Total GST Amount In Words : Rupees ${numberToWords(invoice.totalCGST + invoice.totalSGST)}`, 10, summaryStartY + 40);

    // Terms & Signs
    doc.text("Terms & Conditions:", 10, summaryStartY + 50);
    doc.setFont("helvetica", "normal");
    doc.text(profile?.terms || "E.&.O.E.", 10, summaryStartY + 55);
    
    doc.setFont("helvetica", "bold");
    doc.text(`For ${companyName.toUpperCase()}`, pageWidth - 15, summaryStartY + 55, { align: 'right' });
    doc.text("Auth. Signatory", pageWidth - 15, summaryStartY + 70, { align: 'right' });

    doc.save(`${invoice.invoiceNo}.pdf`);
    return;
  }

  // Fallback to existing logic for other templates
  doc.text("Generic Template Not Updated Yet", 10, 10);
  doc.save("invoice.pdf");
};

const generateThermalPDF = (invoice: Invoice, profile: any) => {
    // Standard thermal logic...
};