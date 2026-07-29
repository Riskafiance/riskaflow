// backend/utils/email.js
const nodemailer = require('nodemailer');

// Configure your transporter (example uses generic SMTP)
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendInvoiceReminder(invoice, customer, user) {
    const mailOptions = {
        from: `"${user.businessName || user.firstName}" <${user.email}>`,
        to: customer.email,
        subject: `Reminder: Invoice #${invoice.invoiceNumber} is Due`,
        text: `Hi ${customer.firstName},\n\nThis is a friendly reminder that invoice #${invoice.invoiceNumber} for $${invoice.totalAmount} is marked as unpaid.\n\nPlease let us know if you have any questions or if you need a new payment link.\n\nThank you,\n${user.businessName || user.firstName}`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Reminder sent to ${customer.email} for invoice ${invoice.invoiceNumber}`);
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

module.exports = { sendInvoiceReminder };