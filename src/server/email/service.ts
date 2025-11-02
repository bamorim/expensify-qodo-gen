/**
 * Email service abstraction for sending organization invitations.
 * DEV implementation logs to console and stores in test sink for assertions.
 */

export interface EmailService {
  sendInviteEmail(params: {
    email: string;
    orgName: string;
    token: string;
  }): Promise<void>;
}

const testSink: { email: string; orgName: string; token: string; at: Date }[] =
  [];

export const devEmailService: EmailService = {
  async sendInviteEmail({ email, orgName, token }) {
    const url = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/orgs/accept?token=${token}`;
    // Log for dev visibility
    console.log(
      `[EMAIL][INVITE] -> ${email} invited to ${orgName}. Accept: ${url}`,
    );
    testSink.push({ email, orgName, token, at: new Date() });
  },
};

export const __emailTestSink = {
  drain: () => {
    const copy = [...testSink];
    testSink.length = 0;
    return copy;
  },
};
