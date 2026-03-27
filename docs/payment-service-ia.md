# PaymentService (IA integration)

Ce document décrit le service de paiement et les routes API disponibles dans l'application Next.js.
Il est destiné à vos futurs agents IA (ou développeurs) qui doivent appeler la logique payment avec le pattern singleton et les routes REST.

## 1) Contexte

- Service principal : `src/lib/services/PaymentService.ts`
- Singleton : `PaymentService.getInstance()`
- Env variable exigée : `PAYMENT_SERVICE` (base URL pointant vers l'endpoint de paiement)
- Routes exposées :
  - `POST /api/payment/collect`
  - `GET /api/payment/check?orderNumber=...`
  - `POST /api/payment/payout`

## 2) Format de données

### 2.1 Collect

`collect(payload)` attend un payload de type union :
- mode mobile money :
  - `channel: "MOBILE_MONEY"`
  - `amount: number`
  - `currency: "USD" | "CDF"`
  - `reference: string`
  - `phone: string` (format libre, normalisé en `243...`)
- mode carte :
  - `channel: "CREDIT_CARD"`
  - `amount: number`
  - `currency: "USD" | "CDF"`
  - `reference: string`
  - `description?: string`

### 2.2 Payout

`payout(payload)` requiert :
- `amount: number`
- `currency: "USD" | "CDF"`
- `phone: string` (normalisé en `243...`)
- `reference: string`

### 2.3 Check transaction

`check(orderNumber: string)`
- `orderNumber`: identifiant commande à vérifier

## 3) Route API

### 3.1 POST /api/payment/collect

- Body JSON : même format que `collect(...)`
- Réponse :
  - `success: boolean`
  - `provider: "flexpay"`
  - `channel` (le channel demandé)
  - `message`
  - `data` (payload retourné du provider)

### 3.2 GET /api/payment/check?orderNumber=...

- Query param : `orderNumber`
- Réponse :
  - `success: boolean`
  - `message`
  - `data` (détails FlexPay)

### 3.3 POST /api/payment/payout

- Body JSON : same as payout payload
- Réponse :
  - `success: boolean`
  - `message`
  - `data`

## 4) CORS

- `OPTIONS` supporté pour `/collect` et `/payout`
- Headers :
  - `Access-Control-Allow-Origin: *`
  - `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`
  - `Access-Control-Allow-Methods: POST, OPTIONS` (pour ces routes)

## 5) Erreurs et validations

- `PaymentService` lève `Error` si :
  - `PAYMENT_SERVICE` manquant
  - payload invalide ou manquant
  - réponses {status >= 300}
- Les routes API renvoient JSON avec `success: false` et `error`.

## 6) Exemple d’appel (agent IA)

### 6.1 Collect mobile money

```http
POST /api/payment/collect
Content-Type: application/json

{
  "channel": "MOBILE_MONEY",
  "amount": 20000,
  "currency": "USD",
  "reference": "INV-0001",
  "phone": "+243812345678"
}
```

### 6.2 Check transaction

```http
GET /api/payment/check?orderNumber=INV-0001
```

### 6.3 Payout

```http
POST /api/payment/payout
Content-Type: application/json

{
  "amount": 6000,
  "currency": "USD",
  "phone": "+243812345678",
  "reference": "PAYOUT-0001"
}
```

## 7) Notes IA

- Toujours vérifier `paymentResponse.success` avant de marquer `order` comme payé.
- Toute erreur serveur doit être relancée ou consignée et traitée.
- Le service normalise automatiquement le téléphone en `243...`.
- Le service est idempotent côté endpoint en n’écrivant pas d’état interne (c’est le caller qui décide l’état transactionnel).