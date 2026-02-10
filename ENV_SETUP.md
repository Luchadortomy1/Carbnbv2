# Configuración de Variables de Entorno

Este proyecto utiliza variables de entorno para mantener seguras las API keys y configuraciones sensibles.

## Configuración Inicial

1. **Copia el archivo de ejemplo:**
   ```bash
   cp .env.example .env
   ```

2. **Completa el archivo `.env` con tus valores reales:**

   ### Firebase
   - Ve a [Firebase Console](https://console.firebase.google.com/)
   - Selecciona tu proyecto
   - Ve a Configuración del proyecto > General > Tus aplicaciones
   - Copia los valores de configuración

   ### Google Pay
   - Ve a [Google Pay & Wallet Console](https://pay.google.com/business/console)
   - Obtén tu Merchant ID
   - Si usas Stripe, obtén tu clave pública desde [Stripe Dashboard](https://dashboard.stripe.com/)

3. **Importante:**
   - ⚠️ **NUNCA subas el archivo `.env` a Git**
   - ✅ Solo sube el archivo `.env.example`
   - ✅ El archivo `.env` ya está incluido en `.gitignore`

## Estructura de Variables

```env
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=tu_api_key_de_firebase
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_dominio_de_auth
EXPO_PUBLIC_FIREBASE_PROJECT_ID=tu_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id  
EXPO_PUBLIC_FIREBASE_APP_ID=tu_app_id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=tu_measurement_id

# Google Pay Configuration  
EXPO_PUBLIC_GOOGLE_PAY_MERCHANT_ID=tu_merchant_id
EXPO_PUBLIC_GOOGLE_PAY_ENVIRONMENT=TEST
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=tu_stripe_key
```

## Notas
- Las variables con prefijo `EXPO_PUBLIC_` son accesibles en el cliente
- Para producción, cambia `EXPO_PUBLIC_GOOGLE_PAY_ENVIRONMENT` a `PRODUCTION`
- Asegúrate de usar las keys correctas para cada entorno (test/production)