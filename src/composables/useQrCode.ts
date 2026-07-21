// Generación de códigos QR en el cliente (no se persisten: se regeneran
// del token cuando hacen falta).

import QRCode from 'qrcode'

export function checkinUrlForToken(token: string): string {
  return `${window.location.origin}/checkin/${token}`
}

export async function qrDataUrl(text: string, size = 512): Promise<string> {
  return QRCode.toDataURL(text, {
    width: size,
    margin: 2,
    color: { dark: '#00205c', light: '#ffffff' },
  })
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  link.click()
}
