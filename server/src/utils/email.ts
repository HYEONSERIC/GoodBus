import nodemailer from 'nodemailer';

// Create a transporter (for development, using Gmail SMTP)
// In production, use a proper email service like SendGrid, AWS SES, etc.
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export async function sendBidReceivedEmail(
    passengerEmail: string,
    tripOrigin: string,
    tripDestination: string,
    bidPrice: number,
    bidderEmail: string
) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('Email not configured. Skipping email send.');
        return;
    }

    try {
        await transporter.sendMail({
            from: `"GoodBus" <${process.env.SMTP_USER}>`,
            to: passengerEmail,
            subject: 'New Bid Received on Your Trip',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">New Bid Received!</h2>
                    <p>You have received a new bid on your trip:</p>
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>Route:</strong> ${tripOrigin} → ${tripDestination}</p>
                        <p><strong>Bid Amount:</strong> $${bidPrice}</p>
                        <p><strong>From:</strong> ${bidderEmail}</p>
                    </div>
                    <p>Log in to your dashboard to view and manage all bids.</p>
                    <p style="color: #666; font-size: 12px; margin-top: 30px;">
                        This is an automated message from GoodBus.
                    </p>
                </div>
            `,
        });
        console.log(`Bid received email sent to ${passengerEmail}`);
    } catch (error) {
        console.error('Error sending bid received email:', error);
    }
}

export async function sendBidAwardedEmail(
    bidderEmail: string,
    tripOrigin: string,
    tripDestination: string,
    bidPrice: number,
    passengerEmail: string
) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('Email not configured. Skipping email send.');
        return;
    }

    try {
        await transporter.sendMail({
            from: `"GoodBus" <${process.env.SMTP_USER}>`,
            to: bidderEmail,
            subject: 'Congratulations! Your Bid Has Been Awarded',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #28a745;">🎉 Your Bid Has Been Awarded!</h2>
                    <p>Congratulations! Your bid has been selected for the following trip:</p>
                    <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
                        <p><strong>Route:</strong> ${tripOrigin} → ${tripDestination}</p>
                        <p><strong>Your Bid Amount:</strong> $${bidPrice}</p>
                        <p><strong>Passenger:</strong> ${passengerEmail}</p>
                    </div>
                    <p>Please contact the passenger to finalize the trip details.</p>
                    <p>Log in to your dashboard to view trip details.</p>
                    <p style="color: #666; font-size: 12px; margin-top: 30px;">
                        This is an automated message from GoodBus.
                    </p>
                </div>
            `,
        });
        console.log(`Bid awarded email sent to ${bidderEmail}`);
    } catch (error) {
        console.error('Error sending bid awarded email:', error);
    }
}


