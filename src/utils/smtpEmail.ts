import nodemailer from 'nodemailer';

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

/**
 * Send guide store booking notification to guide via SMTP
 */
export async function sendGuideStoreBookingNotification(data: {
  guideEmail: string;
  tourName: string;
  fullName: string;
  email: string;
  phone: string;
  tourDate: Date;
  guests: number;
  totalPrice: number;
  currency?: string;
  foodAllergies?: string | null;
  medicalConditions?: string | null;
  nationality?: string | null;
  passportNumber?: string | null;
  countryOfResidence?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
}): Promise<{ success: boolean; error?: unknown }> {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('SMTP not configured; skipping guide notification email');
    return { success: false, error: new Error('SMTP not configured') };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@bucketlist.sa';
  const tourDateFormatted = data.tourDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const currency = data.currency || 'SAR';

  const hasSafetyInfo = !!(data.foodAllergies?.trim() || data.medicalConditions?.trim());
  const safetyBox = hasSafetyInfo
    ? `
    <div style="background: #fee2e2; border: 2px solid #dc2626; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <h3 style="color: #991b1b; margin: 0 0 12px 0;">⚠️ Safety Information</h3>
      ${data.foodAllergies?.trim() ? `<p style="margin: 0 0 8px 0;"><strong>Food Allergies:</strong> ${data.foodAllergies}</p>` : ''}
      ${data.medicalConditions?.trim() ? `<p style="margin: 0;"><strong>Medical Conditions:</strong> ${data.medicalConditions}</p>` : ''}
    </div>
    `
    : '';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #006C35 0%, #059669 100%); color: white; padding: 24px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 24px; border-radius: 0 0 10px 10px; }
    .details { background: white; padding: 20px; border-radius: 8px; margin: 16px 0; }
    .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .label { font-weight: bold; color: #006C35; }
    .footer { text-align: center; padding: 16px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🆕 New Booking Request</h1>
      <p>${data.tourName}</p>
    </div>
    <div class="content">
      ${safetyBox}
      <div class="details">
        <h2 style="color: #006C35; margin-top: 0;">Booking Details</h2>
        <div class="row"><span class="label">Tour:</span><span>${data.tourName}</span></div>
        <div class="row"><span class="label">Date:</span><span>${tourDateFormatted}</span></div>
        <div class="row"><span class="label">Guests:</span><span>${data.guests}</span></div>
        <div class="row"><span class="label">Total:</span><span><strong>${currency} ${data.totalPrice.toLocaleString()}</strong></span></div>
      </div>
      <div class="details">
        <h2 style="color: #006C35; margin-top: 0;">Guest Information</h2>
        <div class="row"><span class="label">Name:</span><span>${data.fullName}</span></div>
        <div class="row"><span class="label">Email:</span><span>${data.email}</span></div>
        <div class="row"><span class="label">Phone:</span><span>${data.phone}</span></div>
        ${data.nationality ? `<div class="row"><span class="label">Nationality:</span><span>${data.nationality}</span></div>` : ''}
        ${data.passportNumber ? `<div class="row"><span class="label">Passport:</span><span>${data.passportNumber}</span></div>` : ''}
        ${data.countryOfResidence ? `<div class="row"><span class="label">Country of Residence:</span><span>${data.countryOfResidence}</span></div>` : ''}
        ${data.emergencyContactName ? `<div class="row"><span class="label">Emergency Contact:</span><span>${data.emergencyContactName}${data.emergencyContactPhone ? ` (${data.emergencyContactPhone})` : ''}</span></div>` : ''}
      </div>
      <p>Log in to your guide dashboard to accept or decline this booking.</p>
    </div>
    <div class="footer">
      <p>© 2026 Bucket List - Guide Store</p>
    </div>
  </div>
</body>
</html>
  `;

  try {
    await transporter.sendMail({
      from,
      to: data.guideEmail,
      subject: `🆕 New Booking Request - ${data.tourName}`,
      html,
    });
    console.log(`✅ Guide store booking notification sent to ${data.guideEmail}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to send guide booking notification:', error);
    return { success: false, error };
  }
}
