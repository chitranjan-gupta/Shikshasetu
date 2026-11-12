'use client';

import { type FC } from 'react';
import { observer } from '@legendapp/state/react';
import { useTranslation } from 'react-i18next';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';

import { Mail } from './mobile-mail';

import { sendToBackground } from '@/lib';
import { mails$, accounts$, domains$ } from '@/store';

const EmailsComponent: FC = () => {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('emails', 'Emails')}</CardTitle>
        <CardDescription>{t('seeYourEmails', 'See Your Emails.')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Mail
          accounts={accounts$.get().accounts}
          mails={mails$.get().mails}
          domains={domains$.get().domains}
          navCollapsedSize={4}
          sendCommand={sendToBackground}
        />
      </CardContent>
    </Card>
  );
};

export const Emails = observer(EmailsComponent);
