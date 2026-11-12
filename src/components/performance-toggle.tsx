import { useEffect, useState, type FC } from 'react';
import { useTranslation } from 'react-i18next';

import {
  readPerformanceMode,
  writePerformanceMode,
} from '@/lib/performance';

import { Switch } from './ui/switch';
import { LanguageSelector } from './language-selector';

interface PerformanceToggleProps {
  className?: string;
}

export const PerformanceToggle: FC<PerformanceToggleProps> = ({ className = '' }) => {
  const [enabled, setEnabled] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    void readPerformanceMode().then(setEnabled);
  }, []);

  return (
    <div className={`mb-4 flex flex-col gap-3 rounded-lg border p-4 w-full ${className}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-medium">{t('performanceMode', 'Performance mode')}</div>
          <p className="text-xs text-muted-foreground">
            {t('performanceModeDesc', 'Use the lighter page menu, faster field search, and on-demand profile loading.')}
          </p>
        </div>
        <Switch
          checked={enabled}
          aria-label={t('performanceMode', 'Performance mode')}
          onCheckedChange={(value) => {
            setEnabled(value);
            void writePerformanceMode(value);
          }}
        />
      </div>
      <div className="flex items-center justify-between border-t pt-2 mt-1">
        <span className="text-xs font-medium text-muted-foreground">{t('language', 'Language')}</span>
        <LanguageSelector />
      </div>
    </div>
  );
};
