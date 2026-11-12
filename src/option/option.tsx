'use client';

import { memo, useMemo, type FC } from 'react';
import { useTranslation } from 'react-i18next';

import { Paths } from '@/components';

const OptionComponent: FC = () => {
  const { t } = useTranslation();

  const boxes = useMemo(
    () => [
      {
        title: t('ai', 'AI'),
        description: t(
          'aiDesc',
          'Chat with AI, ChatGPT, Meta AI, Gemini, llama, gemma, deepseek.'
        ),
        link: '/ai',
      },
      {
        title: t('dashboard', 'Dashboard'),
        description: t(
          'dashboardDesc',
          'Edit your profiles details saved locally and on the cloud.'
        ),
        link: '/dashboard',
      },
      {
        title: t('register', 'Register'),
        description: t(
          'registerDesc',
          'Register to synchronize values across different devices and browser.'
        ),
        link: '/register',
      },
      {
        title: t('login', 'Login'),
        description: t(
          'loginDesc',
          'Login to synchronize values across different devices and browser.'
        ),
        link: '/login',
      },
    ],
    [t]
  );

  return <Paths className="w-screen h-screen" boxes={boxes} />;
};

const Option = memo(OptionComponent);

export default Option;
