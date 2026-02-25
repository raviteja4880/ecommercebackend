// ================= EMAIL THEME CONFIGURATION =================
const THEME = {
  brandName: "MyStorX",
  brandColor: "#0d6efd",
  secondaryColor: "#28a745",
  dangerColor: "#dc3545",
  warningColor: "#ffc107",
  textDark: "#1a1a2e",
  textLight: "#6c757d",
  background: "#f8f9fa",
  cardBg: "#ffffff",
  borderColor: "#e9ecef",
};

// ================= BASE STYLES =================
const BASE_STYLE = `
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: ${THEME.background};
  margin: 0;
  padding: 0;
`;

const CARD_STYLE = `
  background: ${THEME.cardBg};
  border-radius: 16px;
  padding: 40px 30px;
  width: 100%;
  max-width: 650px;
  border: 1px solid ${THEME.borderColor};
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
`;

// ================= HEADER =================
const HEADER = `
<tr>
  <td align="center" style="padding: 20px 0 30px; border-bottom: 2px solid ${THEME.brandColor};">
    <table cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding-right: 15px;">
          <img src="https://exclusive-jade-kaaf6575xb.edgeone.app/favicon.png" width="50" style="display: block;" />
        </td>
        <td>
          <h1 style="margin: 0; font-size: 28px; color: ${THEME.brandColor}; font-weight: 700;">${THEME.brandName}</h1>
          <p style="margin: 5px 0 0; font-size: 12px; color: ${THEME.textLight}; letter-spacing: 1px;">PREMIUM SHOPPING EXPERIENCE</p>
        </td>
      </tr>
    </table>
  </td>
</tr>
`;

// ================= FOOTER =================
const FOOTER = `
<tr>
  <td style="padding: 30px 0 10px; border-top: 1px solid ${THEME.borderColor};">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <p style="margin: 0; font-size: 13px; color: ${THEME.textLight};">
            © ${new Date().getFullYear()} <strong>${THEME.brandName}</strong>. All rights reserved.
          </p>
          <p style="margin: 8px 0 0; font-size: 11px; color: #999;">
            Need help? Contact us at <a href="mailto:support@mystorx.com" style="color: ${THEME.brandColor};">support@mystorx.com</a>
          </p>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding-top: 20px;">
          <a href="#" style="display: inline-block; margin: 0 8px; color: ${THEME.textLight}; text-decoration: none; font-size: 12px;">Privacy Policy</a>
          <span style="color: ${THEME.borderColor};">|</span>
          <a href="#" style="display: inline-block; margin: 0 8px; color: ${THEME.textLight}; text-decoration: none; font-size: 12px;">Terms of Service</a>
          <span style="color: ${THEME.borderColor};">|</span>
          <a href="#" style="display: inline-block; margin: 0 8px; color: ${THEME.textLight}; text-decoration: none; font-size: 12px;">Track Order</a>
        </td>
      </tr>
    </table>
  </td>
</tr>
`;

// ================= HELPER FUNCTIONS =================
const wrapWithTheme = (bodyHtml) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${THEME.brandName}</title>
</head>
<body style="${BASE_STYLE}">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table cellpadding="0" cellspacing="0" style="${CARD_STYLE}">
          ${HEADER}
          ${bodyHtml}
          ${FOOTER}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ================= REUSABLE COMPONENTS =================
const styles = {
  THEME,
  BASE_STYLE,
  CARD_STYLE,
  
  // Status badges
  statusBadge: (text, color) => `
    <span style="
      display: inline-block;
      padding: 6px 16px;
      background: ${color}15;
      color: ${color};
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.5px;">
      ${text}
    </span>
  `,
  
  // Section title
  sectionTitle: (text) => `
    <h3 style="margin: 25px 0 15px; font-size: 16px; color: ${THEME.textDark}; font-weight: 600; border-bottom: 1px solid ${THEME.borderColor}; padding-bottom: 10px;">
      ${text}
    </h3>
  `,
  
  // Info row
  infoRow: (label, value) => `
    <tr>
      <td style="padding: 8px 0; font-size: 14px;">
        <span style="color: ${THEME.textLight}; font-weight: 500;">${label}:</span>
        <span style="color: ${THEME.textDark}; margin-left: 8px;">${value}</span>
      </td>
    </tr>
  `,
  
  // Price row
  priceRow: (label, amount, isTotal = false) => `
    <tr>
      <td style="padding: 10px 0; font-size: ${isTotal ? '18px' : '14px'}; ${isTotal ? 'border-top: 2px solid ' + THEME.brandColor + '; font-weight: 700;' : ''}">
        <span style="color: ${THEME.textLight};">${label}</span>
        <span style="float: right; color: ${isTotal ? THEME.brandColor : THEME.textDark}; font-weight: ${isTotal ? '700' : '500'};">
          ₹${amount.toLocaleString("en-IN")}
        </span>
      </td>
    </tr>
  `,
  
  // CTA Button
  ctaButton: (text, url) => `
    <tr>
      <td align="center" style="padding: 25px 0;">
        <a href="${url}" style="
          display: inline-block;
          padding: 14px 35px;
          background: ${THEME.brandColor};
          color: #ffffff;
          text-decoration: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          letter-spacing: 0.5px;">
          ${text}
        </a>
      </td>
    </tr>
  `,
};

module.exports = { 
  wrapWithTheme, 
  styles, 
  THEME 
};
