export default async function handler(req, res) {
  const TELEGRAM_TOKEN = "TOKEN_TELEGRAM";
  const TELEGRAM_CHAT_ID = "ID_CHAT_TELEGRAM";
  const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

  const WHATSAPP_TOKEN = "YOUR_ACCESS_TOKEN";
  const PHONE_NUMBER_ID = "YOUR_PHONE_NUMBER_ID";
  const WHATSAPP_API = `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`;

  const pelangganMap = new Map(); // Menyimpan ID pelanggan WhatsApp

  if (req.method === "GET") {
    // Verifikasi Webhook WhatsApp
    const verify_token = "TOKEN_KAMU";
    if (req.query["hub.verify_token"] === verify_token) {
      return res.status(200).send(req.query["hub.challenge"]);
    } else {
      return res.status(403).send("Token Salah");
    }
  }

  if (req.method === "POST") {
    const body = req.body;

    // Webhook WhatsApp (Kirim pesan pelanggan ke Telegram)
    if (body.object === "whatsapp_business_account") {
      const message = body.entry[0].changes[0].value.messages?.[0];
      if (message) {
        const sender = message.from; // Nomor pelanggan
        const text = message.text?.body || "Tidak ada teks";

        // Simpan nomor pelanggan
        pelangganMap.set(sender, TELEGRAM_CHAT_ID);

        // Kirim pesan ke Telegram
        await fetch(TELEGRAM_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: `📩 *Pesan dari ${sender} di WhatsApp:* \n\n${text}\n\n_Balas pesan ini untuk membalas ke pelanggan_`,
            parse_mode: "Markdown",
          }),
        });

        return res.status(200).json({ status: "ok" });
      }
    }

    // Webhook Telegram (Meneruskan balasan dari Telegram ke WhatsApp)
    if (body.message) {
      const chatId = body.message.chat.id;
      const text = body.message.text;

      // Pastikan pesan berasal dari admin di Telegram
      if (chatId.toString() !== TELEGRAM_CHAT_ID) {
        return res.status(403).json({ error: "Akses ditolak" });
      }

      // Cek apakah ada pelanggan terakhir yang dikirimi pesan
      const lastCustomer = Array.from(pelangganMap.keys()).pop();
      if (!lastCustomer) {
        return res.status(400).json({ error: "Tidak ada pelanggan untuk dibalas" });
      }

      // Kirim balasan ke WhatsApp pelanggan
      await fetch(WHATSAPP_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: lastCustomer,
          text: { body: `Admin: ${text}` },
        }),
      });

      return res.status(200).json({ status: "ok" });
    }
  }

  return res.status(404).send("Not Found");
}
