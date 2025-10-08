import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface WelcomeEmailProps {
  name: string
}

export const WelcomeEmail = ({ name = 'there' }: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Preview>Welcome to Contentport! Let's create some amazing content together ✨</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>Hey {name}! 👋</Heading>
        </Section>

        <Section style={content}>
          <Text style={paragraph}>
            We're Jo and Josh, and we're excited to have you join Contentport!
          </Text>

          <Text style={paragraph}>
            You just connected your Twitter account, which means we're already learning your
            writing style and analyzing your most successful posts.
          </Text>

          <Text style={paragraph}>Here's what you can do next:</Text>

          <Section style={list}>
            <Text style={listItem}>
              ✍️ <strong>Create your first post</strong> - Our AI already knows your style
            </Text>
            <Text style={listItem}>
              📚 <strong>Add knowledge</strong> - Who you are, how you write, etc.
            </Text>
            <Text style={listItem}>
              🎯 <strong>Set up topic monitoring</strong> - Know when someone mentions your product on Twitter
            </Text>
          </Section>

          <Section style={buttonContainer}>
            <Button style={button} href={`${process.env.BETTER_AUTH_URL}/studio`}>
              Create Your First Post
            </Button>
          </Section>

          <Text style={paragraph}>
            <strong>Need help getting started?</strong>
          </Text>

          <Text style={paragraph}>
            We're here for you! Reach out anytime on Twitter{' '}
            <Link href="https://x.com/joshtriedcoding" style={link}>
              @joshtriedcoding
            </Link>{' '}
            or{' '}
            <Link href="https://x.com/jomeerkatz" style={link}>
              @jomeerkatz
            </Link>
            . We usually respond within a few hours.
          </Text>

          <Text style={signature}>
            Jo & Josh
            <br />
            Founders, Contentport
          </Text>
        </Section>

        <Section style={footer}>
          <Text style={footerText}>
            Contentport - The content engine for your business
            <br />
            <Link href={`${process.env.BETTER_AUTH_URL}/studio/settings`} style={footerLink}>
              Settings
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

export default WelcomeEmail

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

