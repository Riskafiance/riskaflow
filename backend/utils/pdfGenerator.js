const PDFDocument = require('pdfkit');

function buildPDF(invoice, res) {
  const doc = new PDFDocument({ margin: 50 });
  
  // Pipe the PDF directly to the user's browser
  doc.pipe(res);

  // --- Header ---
  doc.fontSize(20).text("Riska's Finance, LLC", { align: 'right' });
  doc.fontSize(10).text("Dixon, IL", { align: 'right' });
  doc.moveDown();

  // --- Invoice Details ---
  doc.fontSize(20).text('INVOICE', 50, 50);
  doc.fontSize(10).text(`Invoice Number: ${invoice.invoiceNumber}`, 50, 80);
  
  // Safely format the date
  const formattedDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A';
  doc.text(`Due Date: ${formattedDate}`, 50, 95);

  // --- Customer Info ---
  doc.moveDown(2);
  doc.text('Bill To:', 50, doc.y);
  doc.text(invoice.customer?.name || 'Unknown Customer');
  doc.text(invoice.customer?.address || '');

  // --- Line Items Table Header ---
  doc.moveDown(2);
  const tableTop = doc.y;
  doc.font('Helvetica-Bold');
  doc.text('Description', 50, tableTop);
  doc.text('Amount', 400, tableTop, { align: 'right' });
  
  doc.moveTo(50, tableTop + 15).lineTo(500, tableTop + 15).stroke();
  doc.font('Helvetica');
  
  // --- The Fix: Loop through items and print them ---
  let position = tableTop + 30; // Start drawing just below the header line
  if (invoice.items && invoice.items.length > 0) {
    invoice.items.forEach(item => {
      doc.text(item.description, 50, position);
      doc.text(`$${item.price.toFixed(2)}`, 400, position, { align: 'right' });
      position += 20; // Move down slightly for the next item if there are multiple
    });
  } else {
    doc.text('No items found.', 50, position);
  }

  // --- Totals ---
  // Push the totals down a bit below the items
  doc.y = position + 30; 
  doc.text(`Subtotal: $${invoice.subTotal.toFixed(2)}`, { align: 'right' });
  doc.text(`Tax: $${invoice.taxTotal.toFixed(2)}`, { align: 'right' });
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').fontSize(14).text(`Total: $${invoice.totalAmount.toFixed(2)}`, { align: 'right' });

  // Finish the PDF
  doc.end();
}

module.exports = { buildPDF };