import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

import {
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
  setAppLanguage,
} from '@/lib/i18n';

interface LanguageSelectorProps {
  className?: string;
}

export function LanguageSelector({ className }: LanguageSelectorProps) {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'en').split(/[-_]/)[0] as SupportedLanguage;

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setAppLanguage(e.target.value as SupportedLanguage);
  };

  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
      <select
        value={currentLang}
        onChange={handleLanguageChange}
        className="h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs text-foreground font-medium shadow-sm outline-none focus:ring-1 focus:ring-ring cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code} className="bg-popover text-popover-foreground">
            {lang.nativeName} ({lang.code.toUpperCase()})
          </option>
        ))}
      </select>
    </div>
  );
}
