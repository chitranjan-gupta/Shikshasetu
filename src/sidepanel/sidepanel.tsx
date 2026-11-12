'use client';

import { useEffect, useMemo, type FC } from 'react';
import { useTranslation } from 'react-i18next';

import { Paths } from '@/components';
import { PerformanceToggle } from '@/components/performance-toggle';
import { requestPageScript } from '@/lib/request-page-script';

const SidePanel: FC = () => {
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
    ],
    [t]
  );

  return (
    <div className="w-screen h-screen">
      <PerformanceToggle />
      <Paths boxes={boxes} />
    </div>
  );
};

export default SidePanel;
