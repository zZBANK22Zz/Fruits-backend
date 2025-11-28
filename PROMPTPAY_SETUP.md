# PromptPay QR Code Setup

## Environment Variable

Add the following to your `.env` file:

```
PROMPTPAY_PHONE_NUMBER=0812345678
```

Replace `0812345678` with your actual PromptPay phone number (10 digits, starting with 0).

## Usage

### Get QR Code Data (JSON)
**GET** `/api/orders/:id/qr-code`

Returns QR code as base64 data URL along with payment details.

**Response:**
```json
{
  "success": true,
  "message": "QR code generated successfully",
  "data": {
    "order_id": 1,
    "order_number": "ORD-2024-0115-1",
    "amount": 10.25,
    "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANS...",
    "payload": "00020101021153037645402...",
    "phone_number": "0812345678"
  }
}
```

### Get QR Code Image (PNG)
**GET** `/api/orders/:id/qr-code/image`

Returns QR code as PNG image directly.

**Usage in HTML:**
```html
<img src="http://localhost:3000/api/orders/1/qr-code/image" alt="PromptPay QR Code" />
```

## Notes

- QR code can only be generated for orders with status `pending`
- Users can only get QR code for their own orders
- Admins can get QR code for any order
- The QR code contains the payment amount and merchant phone number
- Users scan the QR code with their banking app to make payment

