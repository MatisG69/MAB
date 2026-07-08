// Fonction serverless Vercel — envoi du formulaire de contact via Resend.
// La clé API est lue depuis la variable d'environnement RESEND_API_KEY
// (à configurer dans Vercel > Settings > Environment Variables — jamais en dur ici).

// Adresse qui reçoit les messages du formulaire.
const TO_EMAIL = 'moveandbreathelille@gmail.com';

// Expéditeur : le domaine moveandbreathelille.com est vérifié dans Resend
// (SPF/DKIM/DMARC configurés), ce qui garantit la délivrabilité (pas de spam).
// On peut surcharger l'adresse via la variable d'environnement CONTACT_FROM.
const FROM_EMAIL = process.env.CONTACT_FROM || 'Move and Breathe <contact@moveandbreathelille.com>';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Méthode non autorisée.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY manquante dans les variables d\'environnement.');
    return res.status(500).json({ ok: false, error: 'Configuration serveur manquante.' });
  }

  // Vercel parse automatiquement le JSON, mais on gère aussi le cas string.
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  // Anti-spam : champ honeypot caché. Si rempli, on répond OK sans rien envoyer.
  if (body.company) {
    return res.status(200).json({ ok: true });
  }

  const name = (body.name || '').toString().trim();
  const email = (body.email || '').toString().trim();
  const phone = (body.phone || '').toString().trim();
  const subject = (body.subject || 'Demande de contact').toString().trim();
  const message = (body.message || '').toString().trim();

  if (!name || !email || !message) {
    return res.status(400).json({ ok: false, error: 'Merci de renseigner votre nom, votre email et votre message.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'L\'adresse email semble invalide.' });
  }

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1f2a2e;line-height:1.6;">
      <h2 style="color:#2f6f6a;margin:0 0 16px;">Nouveau message — Move and Breathe</h2>
      <p><strong>Sujet :</strong> ${escapeHtml(subject)}</p>
      <p><strong>Nom :</strong> ${escapeHtml(name)}</p>
      <p><strong>Email :</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
      <p><strong>Téléphone :</strong> ${escapeHtml(phone) || '—'}</p>
      <hr style="border:none;border-top:1px solid #e2e2e2;margin:16px 0;">
      <p style="white-space:pre-wrap;">${escapeHtml(message)}</p>
    </div>`;

  const text = `Nouveau message — Move and Breathe\n\nSujet : ${subject}\nNom : ${name}\nEmail : ${email}\nTéléphone : ${phone || '—'}\n\n${message}`;

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TO_EMAIL],
        reply_to: email,
        subject: `[Site] ${subject} — ${name}`,
        html,
        text,
      }),
    });

    if (!resendRes.ok) {
      const detail = await resendRes.text();
      console.error('Erreur Resend:', resendRes.status, detail);
      return res.status(502).json({ ok: false, error: 'L\'envoi a échoué. Réessayez ou écrivez-nous directement par email.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Erreur envoi contact:', err);
    return res.status(500).json({ ok: false, error: 'Une erreur est survenue. Réessayez plus tard.' });
  }
};
