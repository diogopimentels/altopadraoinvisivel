import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const FROM =
  process.env.RESEND_FROM || 'Alto Padrão Invisível <contato@pedidos.altopadraoinvisivel.com.br>';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

type MailItem = { name?: string; quantity?: number; price?: number };

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function orderNumber(id: string) {
  return id.replace(/^ord_/, '');
}

function esc(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function money(value: number) {
  return brl.format(Number(value) || 0);
}

async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY ausente');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'User-Agent': 'AltoPadraoInvisivel (pedidos@altopadraoinvisivel.com.br)',
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.message || data?.error || `Resend ${res.status}`;
    throw new Error(typeof message === 'string' ? message : 'Falha ao enviar e-mail');
  }
  return data;
}

function layout(title: string, body: string) {
  return `<!doctype html>
<html lang="pt-BR">
<body style="margin:0;background:#f6f6f6;font-family:Arial,sans-serif;color:#111;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f6;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:12px;padding:28px 24px;">
        <tr><td>
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#666;">Alto Padrão Invisível</p>
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">${title}</h1>
          ${body}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function itemsTable(items: MailItem[]) {
  const rows = (Array.isArray(items) ? items : [])
    .map((item) => {
      const qty = Math.max(0, Math.floor(Number(item.quantity) || 0));
      const name = esc(String(item.name || 'Produto'));
      const line = money(Number(item.price) * qty);
      return `<tr>
        <td style="padding:8px 0;border-top:1px solid #eee;">${qty}x ${name}</td>
        <td style="padding:8px 0;border-top:1px solid #eee;text-align:right;white-space:nowrap;">${line}</td>
      </tr>`;
    })
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">${rows}</table>`;
}

export async function sendOrderConfirmation(order: {
  id: string;
  customer_name?: string | null;
  customer_email: string;
  items?: MailItem[];
  total_amount?: number | null;
  shipping_cost?: number | null;
}) {
  const number = orderNumber(order.id);
  const name = esc(String(order.customer_name || '').trim() || 'olá');
  const html = layout(
    `Pedido ${esc(number)} confirmado`,
    `<p style="margin:0 0 12px;font-size:15px;line-height:1.5;">${name}, recebemos o seu pagamento.</p>
     ${itemsTable(order.items || [])}
     <p style="margin:16px 0 0;font-size:15px;">Total: <strong>${money(Number(order.total_amount))}</strong></p>
     <p style="margin:8px 0 0;font-size:13px;color:#555;">Frete: ${money(Number(order.shipping_cost))}</p>
     <p style="margin:20px 0 0;font-size:15px;line-height:1.5;">Agora é só aguardar a postagem. Quando a encomenda for postada, mandamos outro e-mail com o código de rastreio.</p>
     <p style="margin:16px 0 0;font-size:13px;color:#666;">Número do pedido: ${esc(number)}</p>`
  );
  await sendEmail(order.customer_email, `Pedido ${number} confirmado`, html);
}

export async function sendTrackingEmail(order: {
  id: string;
  customer_name?: string | null;
  customer_email: string;
  tracking_code: string;
}) {
  const number = orderNumber(order.id);
  const code = order.tracking_code.trim();
  const name = esc(String(order.customer_name || '').trim() || 'olá');
  const link = `https://www.melhorrastreio.com.br/rastreio/${encodeURIComponent(code)}`;
  const html = layout(
    `Pedido ${esc(number)} postado`,
    `<p style="margin:0 0 12px;font-size:15px;line-height:1.5;">${name}, sua encomenda foi postada na transportadora. O código abaixo mostra o trajeto até chegar na sua cidade.</p>
     <p style="margin:0 0 8px;font-size:13px;color:#666;">Código de rastreio</p>
     <p style="margin:0 0 16px;font-size:20px;font-weight:bold;letter-spacing:.04em;">${esc(code)}</p>
     <p style="margin:0;"><a href="${link}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-weight:bold;padding:12px 18px;border-radius:8px;">Acompanhar envio</a></p>
     <p style="margin:16px 0 0;font-size:13px;color:#666;">Número do pedido: ${esc(number)}</p>`
  );
  await sendEmail(order.customer_email, `Código de rastreio do pedido ${number}`, html);
}

/** Manda a confirmação uma vez. Falha de e-mail não desfaz o pagamento. */
export async function sendConfirmationForPaidOrder(orderId: string, payerEmail?: string) {
  const admin = getSupabaseAdmin();
  const { data: order, error } = await admin
    .from('orders')
    .select('id, customer_name, customer_email, items, total_amount, shipping_cost, payment_status, confirmation_email_sent_at')
    .eq('id', orderId)
    .maybeSingle();

  if (error || !order) {
    console.error('Confirmação: pedido ilegível', orderId, error?.message);
    return;
  }
  if (order.payment_status !== 'paid' || order.confirmation_email_sent_at) return;

  const email = String(order.customer_email || payerEmail || '').trim().toLowerCase();
  if (!isValidEmail(email)) {
    console.error('Pedido pago sem e-mail para confirmar', orderId);
    return;
  }

  const sentAt = new Date().toISOString();
  const { data: claimed, error: claimError } = await admin
    .from('orders')
    .update({ confirmation_email_sent_at: sentAt, customer_email: email })
    .eq('id', orderId)
    .is('confirmation_email_sent_at', null)
    .select('id');

  if (claimError) {
    console.error('Confirmação: coluna confirmation_email_sent_at ausente ou update falhou', claimError.message);
    return;
  }
  if (!claimed?.length) return;

  try {
    await sendOrderConfirmation({ ...order, customer_email: email });
  } catch (err) {
    console.error('Falha ao enviar confirmação', orderId, err);
    await admin
      .from('orders')
      .update({ confirmation_email_sent_at: null })
      .eq('id', orderId)
      .eq('confirmation_email_sent_at', sentAt);
  }
}
