# 📧 GymCore Notification Service

A robust microservice for handling email notifications in the GymCore ecosystem. This service integrates with SendGrid for email delivery and listens to RabbitMQ events for triggering notifications.

## 🚀 Features

- **SendGrid Integration**: Professional email delivery with dynamic templates
- **RabbitMQ Event Handling**: Asynchronous event-driven architecture
- **Multiple Email Types**: Membership activation, payment failures, and more
- **Infisical Secret Management**: Secure credential handling
- **Testing Endpoints**: HTTP endpoints for easy testing and debugging
- **Docker Support**: Containerized deployment ready

## 📋 Prerequisites

Before setting up the notification service, ensure you have:

1. **SendGrid Account**: Sign up at [sendgrid.com](https://sendgrid.com) (free tier available)
2. **Infisical Account**: For production secret management
3. **RabbitMQ**: Running instance (included in docker-compose)

## 🔧 Configuration

### Step 1: SendGrid Setup

1. **Create SendGrid Account**
   - Visit [sendgrid.com](https://sendgrid.com) and register
   - Verify your email address

2. **Generate API Key**
   - Go to Settings → API Keys
   - Click "Create API Key"
   - Name it "GymCore_Notifier"
   - Select "Full Access"
   - **Save the key securely - you won't see it again!**

3. **Verify Sender Email**
   - Go to Settings → Sender Authentication
   - Add and verify the email address you'll send from
   - Example: `no-reply@yourdomain.com`

4. **Create Email Templates (Optional)**
   - Go to Email API → Dynamic Templates
   - Create templates for:
     - Membership Activation: `gymcore-membership-activated`
     - Payment Failed: `gymcore-payment-failed`
   - Copy the template IDs (format: `d-xxxxxxxxx`)

### Step 2: Environment Variables

Create a `.env` file based on `.env.example`:

```env
# SendGrid Configuration
SENDGRID_API_KEY=SG.your_actual_api_key_here
SENDGRID_FROM_EMAIL=no-reply@yourdomain.com

# Optional: Template IDs (uses defaults if not provided)
SENDGRID_MEMBERSHIP_ACTIVATED_TEMPLATE_ID=d-your_template_id_here
SENDGRID_PAYMENT_FAILED_TEMPLATE_ID=d-your_template_id_here

# RabbitMQ Configuration
MESSAGE_BUS_URL=amqp://localhost:5672

# Service Configuration
PORT=3007
RUN_HTTP_SERVER=true  # Set to true for testing
```

### Step 3: Infisical Setup (Production)

For production deployments, add these secrets to your Infisical project:

| Key | Value | Description |
|-----|-------|-------------|
| `SENDGRID_API_KEY` | Your SendGrid API key | Required for email sending |
| `SENDGRID_FROM_EMAIL` | Verified sender email | Must be verified in SendGrid |
| `SENDGRID_MEMBERSHIP_ACTIVATED_TEMPLATE_ID` | Template ID | Optional, uses default if not set |
| `SENDGRID_PAYMENT_FAILED_TEMPLATE_ID` | Template ID | Optional, uses default if not set |

## 🏃‍♂️ Running the Service

### Development Mode

```bash
# Install dependencies (from workspace root)
pnpm install

# Start with HTTP server for testing
RUN_HTTP_SERVER=true pnpm --filter notification-service run start:dev

# Or start as background service (production mode)
pnpm --filter notification-service run start:dev
```

### Docker Mode

```bash
# From workspace root
docker-compose up notification-service
```

## 🧪 Testing

### Test Email Endpoint

With `RUN_HTTP_SERVER=true`, you can test email delivery:

```bash
# Send test email
curl -X POST http://localhost:3007/test-email \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com"}'
```

### Health Check

```bash
curl http://localhost:3007/health
```

### Event Testing

The service automatically handles these RabbitMQ events:

- **`payment.completed`**: Triggers membership activation email
- **`payment.failed`**: Triggers payment failure email

## 📨 Email Templates

### Template Variables

**Membership Activation:**
```handlebars
Hello {{name}}!

Your membership #{{membershipId}} has been activated.
Type: {{membershipType}}
Activation Date: {{activationDate}}
```

**Payment Failed:**
```handlebars
Dear {{name}},

We couldn't process your payment for membership #{{membershipId}}.
Amount: {{amount}}
Reason: {{failureReason}}
Date: {{failureDate}}
```

## 📊 Monitoring

The service logs all email events:

- ✅ Successful email deliveries
- ❌ Failed email attempts
- 📧 Email service initialization
- 🐰 RabbitMQ event processing

## 🔒 Security

- All secrets managed through Infisical
- No hardcoded credentials
- Secure SendGrid API integration
- Environment-based configuration

## 🐛 Troubleshooting

### Common Issues

1. **SendGrid 401 Unauthorized**
   - Check your API key is correct
   - Ensure API key has proper permissions

2. **SendGrid 403 Forbidden**
   - Verify your sender email in SendGrid
   - Check sender authentication setup

3. **Template Not Found**
   - Verify template IDs are correct
   - Check template is published in SendGrid

4. **RabbitMQ Connection Issues**
   - Ensure RabbitMQ is running
   - Check MESSAGE_BUS_URL configuration

### Debug Mode

Enable detailed logging:

```bash
DEBUG=* pnpm --filter notification-service run start:dev
```

## 🚀 Deployment

The service is production-ready with:

- Docker containerization
- Infisical secret management
- Health checks
- Graceful shutdown handling
- Error logging and monitoring

## 📝 API Reference

### Endpoints

- `GET /` - Service status
- `GET /health` - Health check
- `POST /test-email` - Send test email (when RUN_HTTP_SERVER=true)

### Events Handled

- `gymcore-exchange` → `payment.completed`
- `gymcore-exchange` → `payment.failed`
