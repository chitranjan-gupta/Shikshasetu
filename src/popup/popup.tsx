'use client';

import { memo, useEffect, useMemo, type FC } from 'react';
import { useTranslation } from 'react-i18next';

import { Paths } from '@/components';
import { PerformanceToggle } from '@/components/performance-toggle';
import { requestPageScript } from '@/lib/request-page-script';

const PopupComponent: FC = () => {
  const { t } = useTranslation();

  useEffect(() => {
    requestPageScript();
  }, []);

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
        title: t('profile', 'Profile'),
        description: t(
          'profileDesc',
          'View your profiles details saved locally and on the cloud.'
        ),
        link: '/profile',
      },
      {
        title: t('login', 'Login'),
        description: t(
          'loginDesc',
          'Login to synchronize values across different devices and browser.'
        ),
        link: '/login',
        newTab: true,
      },
      {
        title: t('register', 'Register'),
        description: t(
          'registerDesc',
          'Register to synchronize values across different devices and browser.'
        ),
        link: '/register',
        newTab: true,
      },
    ],
    [t]
  );

  return (
    <div className="w-[400px] h-screen">
      <PerformanceToggle />
      <Paths boxes={boxes} />
    </div>
  );
};

const Popup = memo(PopupComponent);

export default Popup;
