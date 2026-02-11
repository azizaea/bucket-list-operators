import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);
/**
 * Send booking confirmation email to customer
 */
export async function sendBookingConfirmation(data) {
    try {
        const departureFormatted = data.departureDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .detail-label { font-weight: bold; color: #667eea; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Booking Confirmed!</h1>
      <p>Your adventure awaits</p>
    </div>
    <div class="content">
      <p>Dear ${data.customerName},</p>
      <p>Thank you for booking with Bucket List! Your reservation has been confirmed.</p>
      
      <div class="booking-details">
        <h2 style="color: #667eea; margin-top: 0;">Booking Details</h2>
        <div class="detail-row">
          <span class="detail-label">Booking Reference:</span>
          <span><strong>${data.bookingReference}</strong></span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Tour:</span>
          <span>${data.tourName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Departure:</span>
          <span>${departureFormatted}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Number of Guests:</span>
          <span>${data.numGuests}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Total Price:</span>
          <span><strong>SAR ${data.totalPrice.toLocaleString()}</strong></span>
        </div>
        ${data.meetingPoint ? `
        <div class="detail-row">
          <span class="detail-label">Meeting Point:</span>
          <span>${data.meetingPoint}</span>
        </div>
        ` : ''}
        ${data.meetingPointInstructions ? `
        <div style="margin-top: 15px; padding: 15px; background: #f0f4ff; border-left: 4px solid #667eea; border-radius: 5px;">
          <strong>📍 Meeting Instructions:</strong><br>
          ${data.meetingPointInstructions}
        </div>
        ` : ''}
      </div>

      <p><strong>What's Next?</strong></p>
      <ul>
        <li>You'll receive a reminder 24 hours before departure</li>
        <li>Please arrive 15 minutes before departure time</li>
        <li>Bring your booking reference: <strong>${data.bookingReference}</strong></li>
      </ul>

      <p>If you have any questions, please reply to this email.</p>
      
      <p>Safe travels! 🌍<br>
      <strong>The Bucket List Team</strong></p>
    </div>
    <div class="footer">
      <p>© 2026 Bucket List - Saudi Tourism Excellence</p>
      <p style="font-size: 12px; color: #999;">This is an automated confirmation email. Please do not reply.</p>
    </div>
  </div>
</body>
</html>
    `;
        await resend.emails.send({
            from: 'Bucket List <hello@bucketlist.sa>',
            to: data.customerEmail,
            subject: `✅ Booking Confirmed - ${data.tourName} (${data.bookingReference})`,
            html: emailHtml,
        });
        console.log(`✅ Booking confirmation sent to ${data.customerEmail}`);
        return { success: true };
    }
    catch (error) {
        console.error('❌ Failed to send booking confirmation:', error);
        return { success: false, error };
    }
}
/**
 * Send new booking notification to operator
 */
export async function sendOperatorNotification(data) {
    try {
        const departureFormatted = data.departureDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .detail-label { font-weight: bold; color: #10b981; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 New Booking!</h1>
      <p>You have a new reservation</p>
    </div>
    <div class="content">
      <p>Hello ${data.operatorName},</p>
      <p>Great news! You have received a new booking.</p>
      
      <div class="booking-details">
        <h2 style="color: #10b981; margin-top: 0;">Booking Information</h2>
        <div class="detail-row">
          <span class="detail-label">Booking Reference:</span>
          <span><strong>${data.bookingReference}</strong></span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Tour:</span>
          <span>${data.tourName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Departure:</span>
          <span>${departureFormatted}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Guests:</span>
          <span>${data.numGuests}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Total Revenue:</span>
          <span><strong>SAR ${data.totalPrice.toLocaleString()}</strong></span>
        </div>
      </div>

      <div class="booking-details">
        <h2 style="color: #10b981; margin-top: 0;">Customer Details</h2>
        <div class="detail-row">
          <span class="detail-label">Name:</span>
          <span>${data.customerName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Email:</span>
          <span>${data.customerEmail}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Phone:</span>
          <span>${data.customerPhone}</span>
        </div>
      </div>

      <p><strong>Next Steps:</strong></p>
      <ul>
        <li>Review booking details in your dashboard</li>
        <li>Prepare for ${data.numGuests} guests</li>
        <li>Customer has been sent confirmation email</li>
      </ul>
      
      <p>Best regards,<br>
      <strong>Bucket List Platform</strong></p>
    </div>
    <div class="footer">
      <p>© 2026 Bucket List - Operator Management System</p>
    </div>
  </div>
</body>
</html>
    `;
        await resend.emails.send({
            from: 'Bucket List <hello@bucketlist.sa>',
            to: data.operatorEmail,
            subject: `🎉 New Booking - ${data.tourName} (${data.bookingReference})`,
            html: emailHtml,
        });
        console.log(`✅ Operator notification sent to ${data.operatorEmail}`);
        return { success: true };
    }
    catch (error) {
        console.error('❌ Failed to send operator notification:', error);
        return { success: false, error };
    }
}
