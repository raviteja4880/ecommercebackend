const BASE_STYLE = `
  font-family: Arial, Helvetica, sans-serif;
  background:#f4f7fb;
  padding: 30px 0;
`;

const CARD_STYLE = `
  background: #fff;
  border-radius: 12px;
  padding: 25px;
  width: 600px;
  border: 1px solid #e4e6ef;
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
`;

const LOGO_HEADER = `
<tr>
  <td align="center" style="padding-bottom:10px;">
    <img src="https://exclusive-jade-kaaf6575xb.edgeone.app/favicon.png" width="70" />
    <h2 style="margin:8px 0 0;font-size:24px;color:#0d6efd;">MyStorX</h2>
  </td>
</tr>
`;

const FOOTER = `
<tr>
  <td style="padding:15px 0;text-align:center;font-size:12px;color:#999;">
    © ${new Date().getFullYear()} MyStorX. All rights reserved.
  </td>
</tr>
`;

const wrapWithTheme = (bodyHtml) => `
<table width="100%" cellpadding="0" cellspacing="0" style="${BASE_STYLE}">
  <tr>
    <td align="center">
      <table cellpadding="0" cellspacing="0" style="${CARD_STYLE}">
        ${LOGO_HEADER}
        ${bodyHtml}
        ${FOOTER}
      </table>
    </td>
  </tr>
</table>
`;

module.exports = { wrapWithTheme };
