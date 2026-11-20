/**
 * BJS & BAR ACADEMY - UNIFIED COHESIVE EMAIL TEMPLATE ENGINE
 * Deep Midnight Navy (#0F172A) header banner with Sovereign Gold (#D97706) accent line,
 * clean white content card, structured key-value summary table, gold CTA button, and official academy footer.
 */

function renderAcademyEmailTemplate({
  title = 'BJS & Bar Academy',
  subtitle = 'Judiciary & Advocacy Excellence',
  preheader = '',
  greeting = '',
  messageHtml = '',
  summaryRows = [],
  ctaButton = null, // { text, url }
  footerNote = ''
}) {
  const currentYear = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; -webkit-font-smoothing: antialiased; line-height: 1.6; color: #1E293B;">
  ${preheader ? `<div style="display:none;font-size:1px;color:#F8FAFC;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</div>` : ''}
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; padding: 24px 12px;">
    <tr>
      <td align="center">
        <!-- Main Container Card -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08);">
          <!-- Header Banner: Midnight Navy + Sovereign Gold Accent -->
          <tr>
            <td style="background-color: #0F172A; padding: 28px 24px; text-align: center; border-bottom: 3px solid #D97706;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;">
                <tr>
                  <td align="center">
                    <div style="font-size: 30px; line-height: 1; margin-bottom: 8px;">⚖️</div>
                    <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.5px;">BJS & Bar Academy</h1>
                    <p style="margin: 5px 0 0 0; font-size: 11px; font-weight: 700; color: #D97706; text-transform: uppercase; letter-spacing: 1.5px;">
                      ${subtitle || 'Judiciary & Advocacy Excellence'}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px 28px;">
              ${greeting ? `<p style="font-size: 16px; font-weight: 800; color: #0F172A; margin: 0 0 16px 0;">${greeting}</p>` : ''}
              ${messageHtml ? `<div style="font-size: 14px; color: #334155; margin-bottom: 24px; line-height: 1.7;">${messageHtml}</div>` : ''}

              <!-- Summary Key-Value Table -->
              ${Array.isArray(summaryRows) && summaryRows.length > 0 ? `
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; border-radius: 12px; border: 1px solid #E2E8F0; margin-bottom: 24px; overflow: hidden;">
                ${summaryRows.map(([k, v]) => `
                <tr style="border-bottom: 1px solid #E2E8F0;">
                  <td style="padding: 10px 16px; font-size: 13px; font-weight: 700; color: #475569; width: 38%; background-color: #F1F5F9;">${k}</td>
                  <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #0F172A;">${v}</td>
                </tr>
                `).join('')}
              </table>` : ''}

              <!-- CTA Button -->
              ${ctaButton && ctaButton.url ? `
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 28px auto 16px auto;">
                <tr>
                  <td align="center" style="border-radius: 10px; background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);">
                    <a href="${ctaButton.url}" target="_blank" style="font-size: 14px; font-weight: 800; font-family: inherit; color: #0F172A; text-decoration: none; padding: 14px 32px; border-radius: 10px; display: inline-block; letter-spacing: 0.3px;">
                      ${ctaButton.text || 'ভিজিট করুন'}
                    </a>
                  </td>
                </tr>
              </table>` : ''}

              ${footerNote ? `<p style="font-size: 12px; color: #64748B; margin: 20px 0 0 0; line-height: 1.6; border-top: 1px solid #F1F5F9; padding-top: 14px;">${footerNote}</p>` : ''}
            </td>
          </tr>

          <!-- Footer Banner -->
          <tr>
            <td style="background-color: #090D16; padding: 20px 24px; text-align: center; border-top: 1px solid #1E293B;">
              <p style="margin: 0; font-size: 11px; color: #94A3B8; font-weight: 600;">
                © ${currentYear} BJS & Bar Academy. All Rights Reserved.
              </p>
              <p style="margin: 6px 0 0 0; font-size: 10px; color: #64748B;">
                Official Portal: <a href="https://bjs.kodl.uk" style="color: #D97706; text-decoration: none;">https://bjs.kodl.uk</a> | Helpline: 01800077663
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

module.exports = {
  renderAcademyEmailTemplate
};
