import { notificationService } from './notificationService';
import { UserContactInfo } from './userService';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export interface PaymentReceiptData {
  paymentId: string;
  amount: number;
  vehicleInfo: string;
  bookingDates: string;
  days: number;
  serviceFee: number;
  processingFee: number;
  subtotal: number;
}

export interface RenterReceiptData extends PaymentReceiptData {
  ownerInfo: UserContactInfo;
}

export interface OwnerReceiptData extends PaymentReceiptData {
  renterInfo: UserContactInfo;
}

export const receiptService = {
  async createRenterReceipt(renterId: string, data: RenterReceiptData): Promise<void> {
    try {
      const receiptMessage = `
🧾 RECIBO DE COMPRA - CARBNB

✅ PAGO PROCESADO EXITOSAMENTE

🚗 VEHÍCULO RENTADO:
${data.vehicleInfo}

📅 FECHAS DE RENTA:
${data.bookingDates}
Duración: ${data.days} día${data.days > 1 ? 's' : ''}

💰 DESGLOSE DE PAGO:
Precio por día: $${data.subtotal}
Comisiones: $${data.processingFee}
──────────────────
TOTAL PAGADO: $${data.amount}

🏢 PROPIETARIO DEL VEHÍCULO:
Nombre: ${data.ownerInfo.name}
Email: ${data.ownerInfo.email}
Teléfono: ${data.ownerInfo.phone}

🆔 ID DE TRANSACCIÓN: ${data.paymentId.slice(-8)}
📅 Fecha: ${new Date().toLocaleString()}

📱 El propietario ha sido notificado automáticamente.
💬 Puedes contactarlo directamente para coordinar la entrega.

¡Gracias por usar Carbnb!
      `.trim();

      await notificationService.createNotification({
        userId: renterId,
        title: '🧾 Recibo de Compra - Pago Exitoso',
        message: receiptMessage,
        type: 'payment',
        data: {
          type: 'renter_receipt',
          paymentId: data.paymentId,
          amount: data.amount,
          vehicleInfo: data.vehicleInfo,
          ownerInfo: data.ownerInfo,
        }
      });


    } catch (error) {
      console.error('Error creating renter receipt:', error);
    }
  },

  async createOwnerReceipt(ownerId: string, data: OwnerReceiptData): Promise<void> {
    try {
      const receiptMessage = `
💰 RECIBO DE PAGO RECIBIDO - CARBNB

🎉 ¡HAS RECIBIDO UN PAGO!

🚗 VEHÍCULO RENTADO:
${data.vehicleInfo}

📅 FECHAS RESERVADAS:
${data.bookingDates}
Duración: ${data.days} día${data.days > 1 ? 's' : ''}

💵 DETALLES DEL PAGO:
Precio por día: $${data.subtotal}
Comisiones: $${data.processingFee}
──────────────────
TOTAL RECIBIDO: $${data.amount}

👤 INFORMACIÓN DEL RENTER:
Nombre: ${data.renterInfo.name}
Email: ${data.renterInfo.email}
Teléfono: ${data.renterInfo.phone}

🆔 ID DE TRANSACCIÓN: ${data.paymentId.slice(-8)}
📅 Fecha: ${new Date().toLocaleString()}

🔒 Tu vehículo está ahora marcado como "RESERVADO"
🚫 No aparecerá en búsquedas públicas durante estas fechas
📞 Contacta al renter para coordinar la entrega

¡Felicidades por tu renta exitosa!
      `.trim();

      await notificationService.createNotification({
        userId: ownerId,
        title: '💰 Recibo de Pago - Has Recibido Dinero',
        message: receiptMessage,
        type: 'payment',
        data: {
          type: 'owner_receipt',
          paymentId: data.paymentId,
          amount: data.amount,
          vehicleInfo: data.vehicleInfo,
          renterInfo: data.renterInfo,
        }
      });


    } catch (error) {
      console.error('Error creating owner receipt:', error);
    }
  },

  // Función para descargar recibo como PDF
  downloadReceiptPDF: async (receiptData: RenterReceiptData | OwnerReceiptData): Promise<void> => {
    try {
      const isRenter = 'ownerInfo' in receiptData;
      const htmlContent = receiptService.generateHTMLReceipt(receiptData, isRenter);
      
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Compartir Recibo Carbnb',
          UTI: 'com.adobe.pdf',
        });
      } else {

      }
    } catch (error) {
      console.error('Error generando PDF:', error);
      throw error;
    }
  },

  generateHTMLReceipt: (data: RenterReceiptData | OwnerReceiptData, isRenter: boolean): string => {
    const formatDate = (date: Date = new Date()) => date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const contactInfo = isRenter 
      ? (data as RenterReceiptData).ownerInfo
      : (data as OwnerReceiptData).renterInfo;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Helvetica', Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #3B82F6;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            color: #3B82F6;
            margin-bottom: 10px;
          }
          .receipt-title {
            font-size: 20px;
            color: #6B7280;
          }
          .section {
            margin-bottom: 25px;
          }
          .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #374151;
            margin-bottom: 10px;
            border-left: 4px solid #3B82F6;
            padding-left: 10px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
          }
          .info-item {
            padding: 10px;
            background-color: #F9FAFB;
            border-radius: 6px;
          }
          .info-label {
            font-weight: bold;
            color: #6B7280;
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 5px;
          }
          .info-value {
            font-size: 14px;
            color: #111827;
          }
          .pricing-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          .pricing-table td {
            padding: 8px 12px;
            border-bottom: 1px solid #E5E7EB;
          }
          .pricing-table .label {
            text-align: left;
            color: #6B7280;
          }
          .pricing-table .value {
            text-align: right;
            font-weight: 500;
          }
          .total-row {
            background-color: #F3F4F6;
            font-weight: bold;
            font-size: 16px;
          }
          .total-row td {
            border-top: 2px solid #3B82F6;
            border-bottom: 2px solid #3B82F6;
            color: #111827;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #E5E7EB;
            color: #6B7280;
            font-size: 12px;
          }
          .payment-info {
            background-color: #EFF6FF;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #3B82F6;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🚗 CARBNB</div>
          <div class="receipt-title">Recibo de ${isRenter ? 'Pago' : 'Ingresos'}</div>
        </div>

        <div class="section">
          <div class="section-title">📋 Información de la Transacción</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">ID de Pago</div>
              <div class="info-value">#${data.paymentId.slice(-8).toUpperCase()}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Fecha de Transacción</div>
              <div class="info-value">${formatDate()}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">🚗 Vehículo y Periodo</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Vehículo</div>
              <div class="info-value">${data.vehicleInfo}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Periodo de Renta</div>
              <div class="info-value">${data.bookingDates} (${data.days} días)</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">👥 ${isRenter ? 'Propietario del Vehículo' : 'Persona que Rentó'}</div>
          <div class="info-item">
            <div class="info-label">Nombre</div>
            <div class="info-value">${contactInfo.name}</div>
            <div class="info-label">Email</div>
            <div class="info-value">${contactInfo.email}</div>
            <div class="info-label">Teléfono</div>
            <div class="info-value">${contactInfo.phone || 'No proporcionado'}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">💰 Desglose Financiero</div>
          <table class="pricing-table">
            <tr>
              <td class="label">Subtotal del vehículo (${data.days} días)</td>
              <td class="value">$${data.subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td class="label">Tarifa de servicio Carbnb (5%)</td>
              <td class="value">$${data.serviceFee.toFixed(2)}</td>
            </tr>
            <tr>
              <td class="label">Comisión por transacción</td>
              <td class="value">$${data.processingFee.toFixed(2)}</td>
            </tr>
            <tr class="total-row">
              <td class="label">TOTAL ${isRenter ? 'PAGADO' : 'RECIBIDO'}</td>
              <td class="value">$${data.amount.toFixed(2)}</td>
            </tr>
          </table>
        </div>

        <div class="section">
          <div class="section-title">💳 Información de Pago</div>
          <div class="payment-info">
            <strong>ID de Transacción:</strong> ${data.paymentId}<br>
            <strong>Procesado por:</strong> Stripe Payments<br>
            <strong>Estado:</strong> ${isRenter ? 'Pago exitoso' : 'Ingreso confirmado'} ✅
          </div>
        </div>

        <div class="footer">
          <p><strong>Carbnb - Plataforma de Renta de Vehículos</strong></p>
          <p>Este recibo fue generado automáticamente el ${formatDate()} a las ${new Date().toLocaleTimeString('es-MX')}</p>
          <p>Para soporte técnico, contacta: soporte@carbnb.com</p>
        </div>
      </body>
      </html>
    `;
  },

  generateTextReceipt: (data: RenterReceiptData | OwnerReceiptData): string => {
    const isRenter = 'ownerInfo' in data;
    
    return `
🚗 CARBNB - RECIBO DE ${isRenter ? 'PAGO' : 'INGRESO'}
═══════════════════════════════════════

📋 Información de la Transacción:
ID de Pago: ${data.paymentId}
Fecha: ${new Date().toLocaleDateString()}

🚗 Vehículo:
${data.vehicleInfo}

📅 Periodo:
${data.bookingDates} (${data.days} días)

💰 Desglose Financiero:
Subtotal del vehículo: $${data.subtotal.toFixed(2)}
Tarifa de servicio (5%): $${data.serviceFee.toFixed(2)}
Tarifa de procesamiento: $${data.processingFee.toFixed(2)}
────────────────────────
TOTAL: $${data.amount.toFixed(2)}

${isRenter ? `👤 Propietario del vehículo:
Nombre: ${(data as RenterReceiptData).ownerInfo.name}
Email: ${(data as RenterReceiptData).ownerInfo.email}
Teléfono: ${(data as RenterReceiptData).ownerInfo.phone || 'No proporcionado'}
` : `👤 Persona que rentó:
Nombre: ${(data as OwnerReceiptData).renterInfo.name}
Email: ${(data as OwnerReceiptData).renterInfo.email}
Teléfono: ${(data as OwnerReceiptData).renterInfo.phone || 'No proporcionado'}
`}

═══════════════════════════════════════
Carbnb - Plataforma de Renta de Vehículos
Recibo generado automáticamente
    `;
  },
};