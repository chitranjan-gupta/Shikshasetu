'use client';

import { memo, type FC } from 'react';
import { useRouteError } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const ErrorComponent: FC = () => {
  const { t } = useTranslation();
  let error: { statusText?: string; message?: string } | undefined;

  // useRouteError can throw outside router error context
  const rawError = useRouteError();
  if (rawError && typeof rawError === 'object') {
    error = rawError as { statusText?: string; message?: string };
    console.error(error);
  }

  return (
    <div id="error-page" className="p-8 text-center">
      <h1 className="text-2xl font-bold">{t('pageNotFound', 'Page Not Found')}</h1>
      <p className="text-muted-foreground mt-2">
        {t('pageNotFoundDesc', 'The requested page does not exist or an unexpected error occurred.')}
      </p>
      {error && (
        <p className="mt-2 text-sm text-red-500">
          <i>{error.statusText || error?.message}</i>
        </p>
      )}
    </div>
  );
};

const Error = memo(ErrorComponent);

export default Error;
