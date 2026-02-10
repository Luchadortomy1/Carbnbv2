import { Alert } from 'react-native';

// Configuración de Google Pay
const GOOGLE_PAY_MERCHANT_ID = 'BCR2DN5TR3RPX4IZ'; // Tu merchant ID de Google Pay
const GOOGLE_PAY_ENVIRONMENT = 'TEST'; // Cambiar a 'PRODUCTION' para producción
const GATEWAY_NAME = 'stripe'; // Gateway de pago
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51P3NfOFew8z1dTUgzofAw7EmfoMJWjrm5FFmE3En0hJ3rQoxQ40oO6TKFp5mqFGaKGCTHTY6DTTMeKF4wo4VexQc00gyF7RsbX';

export interface GooglePayRequest {
  amount: number;
  currencyCode: string;
  description: string;
}

export interface GooglePayResult {
  success: boolean;
  paymentMethodData?: any;
  error?: string;
}

class GooglePayService {
  private merchantId: string = GOOGLE_PAY_MERCHANT_ID;
  private paymentsClient: any = null;
  
  async isReadyToPay(): Promise<boolean> {
    try {
      console.log(`🔍 Verificando Google Pay con Merchant ID: ${this.merchantId}`);
      
      // Para proyectos Expo/React Native, simular verificación
      // En producción, esto se conectaría a la API real
      const isAvailable = await this.checkGooglePayAvailability();
      
      console.log('📱 Google Pay disponible:', isAvailable);
      return isAvailable;
    } catch (error) {
      console.error('❌ Error verificando Google Pay:', error);
      return false;
    }
  }

  private async checkGooglePayAvailability(): Promise<boolean> {
    try {
      // Simular detección de Google Pay
      // En un entorno real, esto verificaría Google Play Services
      return new Promise((resolve) => {
        setTimeout(() => {
          // Para demo, consideramos que siempre está disponible
          resolve(true);
        }, 500);
      });
    } catch (error) {
      return false;
    }
  }

  async requestPayment(request: GooglePayRequest): Promise<GooglePayResult> {
    try {
      console.log('🚀 Iniciando pago REAL con Google Pay:', request);

      // Para Expo/React Native, mostrar interfaz nativa simulada pero más realista  
      return new Promise((resolve) => {
        Alert.alert(
          '💳 Google Pay',
          `💰 Total: $${request.amount.toFixed(2)} USD
🏪 Merchant: ${this.merchantId}
📝 ${request.description}

🔒 Se procesará con tu método de pago predeterminado en Google Pay.

⚡ Esta es una simulación del flujo real para desarrollo/demo.`,
          [
            {
              text: '❌ Cancelar',
              style: 'cancel',
              onPress: () => {
                console.log('❌ Usuario canceló el pago de Google Pay');
                resolve({
                  success: false,
                  error: 'Pago cancelado por el usuario'
                });
              }
            },
            {
              text: '✅ Continuar con Google Pay',
              onPress: () => {
                console.log('✅ Procesando pago con Google Pay...');
                
                // Simular procesamiento
                setTimeout(() => {
                  const paymentToken = this.generatePaymentToken();
                  
                  console.log('🎉 Pago exitoso con Google Pay:', paymentToken);
                  
                  resolve({
                    success: true,
                    paymentMethodData: {
                      type: 'google_pay',
                      id: paymentToken,
                      merchantId: this.merchantId,
                      paymentData: {
                        paymentMethodData: {
                          tokenizationData: {
                            token: paymentToken,
                            type: 'PAYMENT_GATEWAY'
                          },
                          info: {
                            cardNetwork: 'VISA',
                            cardDetails: '1234'
                          },
                          type: 'CARD'
                        }
                      },
                      card: {
                        last4: '1234',
                        brand: 'visa',
                        funding: 'credit'
                      }
                    }
                  });
                }, 2000); // Simular delay del procesamiento
              }
            }
          ],
          { cancelable: false }
        );
      });
      
    } catch (error) {
      console.error('❌ Google Pay Service Error:', error);
      
      let errorMessage = 'Error procesando Google Pay';
      
      if (error.message?.includes('canceled') || error.message?.includes('cancelado')) {
        errorMessage = 'Pago cancelado por el usuario';
      } else if (error.message?.includes('network') || error.message?.includes('connection')) {
        errorMessage = 'Error de conexión. Verifica tu internet';
      } else if (error.message?.includes('configuration')) {
        errorMessage = 'Error de configuración de Google Pay';
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  private generatePaymentToken(): string {
    // Generar token único para el pago
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `gp_${this.merchantId}_${timestamp}_${random}`;
  }

  async loadPaymentData(request: GooglePayRequest): Promise<any> {
    // Esta función usa la implementación mejorada de Google Pay
    const result = await this.requestPayment(request);
    
    if (!result.success) {
      throw new Error(result.error || 'Error al procesar el pago');
    }
    
    return result.paymentMethodData;
  }

  // Método para obtener la configuración de Google Pay (para uso futuro)
  getGooglePayConfig(amount: number, currencyCode: string = 'USD') {
    return {
      apiVersion: 2,
      apiVersionMinor: 0,
      allowedPaymentMethods: [
        {
          type: 'CARD',
          parameters: {
            allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
            allowedCardNetworks: ['VISA', 'MASTERCARD', 'AMEX', 'DISCOVER'],
          },
          tokenizationSpecification: {
            type: 'PAYMENT_GATEWAY',
            parameters: {
              gateway: GATEWAY_NAME,
              gatewayMerchantId: this.merchantId,
            },
          },
        },
      ],
      merchantInfo: {
        merchantId: this.merchantId,
        merchantName: 'Carbnb',
      },
      transactionInfo: {
        totalPriceStatus: 'FINAL',
        totalPrice: amount.toFixed(2),
        currencyCode: currencyCode,
        countryCode: 'US',
      },
    };
  }
}

export const googlePayService = new GooglePayService();