import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface ProSubscriptionEmailProps {
  name: string
  invoicePdfUrl?: string
}

export const ProSubscriptionEmail = ({
  name = 'there',
  invoicePdfUrl,
}: ProSubscriptionEmailProps) => (
  <Html>
    <Head />
    <Preview>Welcome to Contentport Pro! Thanks for supporting us 💙</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>You're now Pro! 🎉</Heading>
        </Section>

        <Section style={content}>
          <Text style={paragraph}>Hey {name},</Text>

          <Text style={paragraph}>
            Huge thanks for upgrading to Contentport Pro. Your support means the world to
            us and helps us build an even better product!
          </Text>

          <Text style={paragraph}>
            <strong>Here's what you now have access to:</strong>
          </Text>

          <Section style={list}>
            <Text style={listItem}>
              ✏️ <strong>Unlimited AI generations</strong> - Create & schedule days of
              content at once
            </Text>
            <Text style={listItem}>
              🎯 <strong>Topic monitoring</strong> - Know when someone mentions your
              product on Twitter
            </Text>
            <Text style={listItem}>
              🖼️ <strong>No more watermarks</strong> - Create beautiful tweet visuals in
              seconds
            </Text>
            <Text style={listItem}>
              👥 <strong>Connect 3 accounts</strong> - Manage all Twitter accounts in one
              place
            </Text>
            <Text style={listItem}>
              ⚡ <strong>Priority support</strong> - We'll help you with anything you need
            </Text>
          </Section>

          <Section style={buttonContainer}>
            <Button style={button} href={`${process.env.BETTER_AUTH_URL}/studio`}>
              Start Creating
            </Button>
          </Section>

          <Text style={paragraph}>
            <strong>Need help or have ideas?</strong>
          </Text>

          <Text style={paragraph}>
            As a Pro user, you get priority support. Reach out anytime:
          </Text>

          <Section style={contactList}>
            <Text style={contactItem}>
              💬{' '}
              <strong>
                X DMs:{' '}
                <Link href="https://x.com/joshtriedcoding" style={link}>
                  @joshtriedcoding
                </Link>{' '}
                or{' '}
                <Link href="https://x.com/jomeerkatz" style={link}>
                  @jomeerkatz
                </Link>
              </strong>
            </Text>
            <Text style={contactItem}>
              📅{' '}
              <strong>
                Book a call:{' '}
                <Link href="https://cal.com/joshtriedcoding" style={link}>
                  Schedule with Josh
                </Link>
              </strong>
            </Text>
          </Section>

          <Text style={paragraph}>
            We're usually super responsive (we promise we're not bots 💀) and love hearing
            from our users. Whether it's a question, feature request, or just to say hi -
            we're here!
          </Text>

          <Text style={signature}>
            Jo & Josh
            <br />
            Founders, Contentport
          </Text>

          {invoicePdfUrl && (
            <Section style={invoiceSection}>
              <Text style={invoiceText}>
                📄 <strong>Your invoice:</strong>{' '}
                <Link href={invoicePdfUrl} style={link}>
                  Download PDF
                </Link>
              </Text>
            </Section>
          )}
        </Section>

        <Section style={footer}>
          <Text style={footerText}>
            Contentport - The content engine for your business
            <br />
            <Link
              href={`${process.env.BETTER_AUTH_URL}/studio/settings`}
              style={footerLink}
            >
              Manage Subscription
            </Link>{' '}
            •{' '}
            <Link href="https://x.com/joshtriedcoding" style={footerLink}>
              Support
            </Link>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default ProSubscriptionEmail

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
  borderRadius: '8px',
}

const header = {
  padding: '32px 48px 0',
}

const content = {
  padding: '0 48px',
}

const h1 = {
  color: '#1a1a1a',
  fontSize: '32px',
  fontWeight: '700',
  margin: '0 0 24px',
  padding: '0',
  lineHeight: '1.3',
}

const paragraph = {
  color: '#525252',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
}

const list = {
  margin: '24px 0',
}

const listItem = {
  color: '#525252',
  fontSize: '16px',
  lineHeight: '28px',
  margin: '8px 0',
}

const contactList = {
  margin: '16px 0',
}

const contactItem = {
  color: '#525252',
  fontSize: '16px',
  lineHeight: '28px',
  margin: '12px 0',
}

const buttonContainer = {
  margin: '32px 0',
  textAlign: 'center' as const,
}

const button = {
  backgroundColor: '#000000',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
}

const link = {
  color: '#000000',
  textDecoration: 'underline',
  fontWeight: '600',
}

const callout = {
  backgroundColor: '#f9fafb',
  borderLeft: '4px solid #000000',
  padding: '16px 20px',
  margin: '24px 0',
  borderRadius: '4px',
}

const calloutText = {
  color: '#525252',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0',
}

const signature = {
  color: '#525252',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '32px 0 0',
  fontStyle: 'italic',
}

const footer = {
  padding: '0 48px',
  marginTop: '32px',
  borderTop: '1px solid #e5e7eb',
  paddingTop: '24px',
}

const footerText = {
  color: '#a3a3a3',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '0',
  textAlign: 'center' as const,
}

const footerLink = {
  color: '#a3a3a3',
  textDecoration: 'underline',
}

const invoiceSection = {
  marginTop: '32px',
  padding: '16px',
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  textAlign: 'center' as const,
}

const invoiceText = {
  color: '#525252',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0',
}
