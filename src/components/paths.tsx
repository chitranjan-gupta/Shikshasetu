'use client';

import { memo, type FC } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { openTab } from '@/lib';

// Open an extension option page in a new tab.
// openTab handles converting relative URLs to absolute extension URLs automatically.
const openExtensionPage = (link: string) => {
  const hash = link.startsWith('/') ? link : `/${link}`;
  openTab({ url: `src/option/index.html#${hash}` });
};

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface Box {
  title: string;
  description: string;
  link: string; // e.g. '/login' or '/ai'
  newTab?: boolean; // open in new tab when true (used for login/register)
}

interface PathsProps {
  boxes: Box[];
  className?: string;
}

const PathsComponent: FC<PathsProps> = ({ boxes, className = '' }) => {
  const { t } = useTranslation();
  return (
    <div className={className}>
      <div className="w-full h-full flex flex-row flex-wrap items-center justify-center gap-5">
        {boxes.map((box) => (
          <Card key={box.title} className="w-[350px]">
            <CardHeader>
              <CardTitle>{box.title}</CardTitle>
              <CardDescription>{box.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                to={box.link}
                onClick={
                  box.newTab
                    ? (e) => {
                        e.preventDefault();
                        openExtensionPage(box.link);
                      }
                    : undefined
                }
              >
                {t('open', 'Open')}
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export const Paths = memo(PathsComponent);
