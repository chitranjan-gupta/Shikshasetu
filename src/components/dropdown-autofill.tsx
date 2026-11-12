'use client';

import { Fragment, useMemo, useCallback, type FC } from 'react';
import { useTranslation } from 'react-i18next';

import { getAllInputFields, setAllInputFields } from '@/lib/form-fill';
import { browserStorage } from '@/lib/browser';
import {
  generateRandomEmail,
  generateRandomPassword,
  normalizeText,
} from '@/lib/text';

interface RightClickMenuTitleProps {
  title: () => string;
  handleClick: (ce: any) => void;
}

const RightClickMenuTitle: FC<RightClickMenuTitleProps> = ({
  title,
  handleClick,
}) => {
  return (
    <div
      className="pb-[10px] bg-blue-300 text-white font-bold"
      onClick={handleClick}
    >
      {title()}
    </div>
  );
};

interface RightClickMenuItemProps {
  title: () => string;
  handleClick: (ce?: any) => void;
}

const RightClickMenuItem: FC<RightClickMenuItemProps> = ({
  title,
  handleClick,
}) => {
  return (
    <div
      className="mt-[10px] p-[5px_0] border-t border-solid border-t-gray-400 cursor-pointer font-semibold"
      onClick={handleClick}
    >
      {title()}
    </div>
  );
};

interface RightClickMenuSubItemProps {
  title: () => string;
  handleClick: (ce?: any) => void;
  parent?: string;
}

const RightClickMenuSubItem: FC<RightClickMenuSubItemProps> = ({
  title,
  handleClick,
  parent,
}) => {
  return (
    <div
      className="p-[5px_0_0_10px] border-t border-solid border-t-gray-400 cursor-pointer"
      onClick={handleClick}
      data-parent={parent}
    >
      {`> ${title()}`}
    </div>
  );
};

interface RightClickMenuProps {
  title: string;
  event: Event;
  items: [string, unknown][];
  document_files: Map<string, object>;
}

export const RightClickMenu: FC<RightClickMenuProps> = ({
  title,
  event,
  items,
  document_files,
}) => {
  const { t } = useTranslation();
  const handleTitle = useCallback((title: string | object) => {
    return normalizeText(
      typeof title === 'object'
        ? (title as { document_type: string }).document_type
        : title || ''
    );
  }, []);
  const handleClick = useCallback(
    (value: string | object, clickEvent?: any, parent?: string) => {
      const target = event.target as HTMLInputElement;
      const targetParent = parent || clickEvent?.target?.dataset?.parent;
      if (targetParent === 'sites') {
        if (typeof value === 'object') {
          setAllInputFields(value as Record<string, unknown>);
        }
      } else if (target && target.type === 'file') {
        console.log(document_files);
        const file_ = document_files.get(
          (value as unknown as { url: string }).url
        ) as unknown as File;
        console.log(file_);
      } else if (target) {
        target.value = String(value) || '';
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));
      }
    },
    [document_files, event.target]
  );
  const data: any[] = useMemo(() => {
    const datarow = items.map((item) =>
      Array.isArray(item[1]) &&
      typeof item[1][0] === 'object' &&
      !Array.isArray(item[1][0]) &&
      item[0] === 'custom_fields'
        ? item[1].map((val) => [val['attribute_name'], val['value']])
        : item
    );
    const mergedArray: any[] = [];
    datarow.forEach((item) => {
      if (Array.isArray(item[0])) {
        item.forEach((val) => mergedArray.push(val));
      } else {
        mergedArray.push(item);
      }
    });
    return mergedArray;
  }, [items]);
  return (
    <div
      className="fixed bottom-[10px] right-[10px] bg-white text-gray-800 border border-solid border-[#ccc] p-[15px] cursor-pointer z-[2147483647] rounded-[5px] max-h-[220px] overflow-y-scroll shadow-[0_0_12px_rgba(0,0,0,0.15)] text-sm"
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        zIndex: 2147483647,
        maxHeight: '220px',
        backgroundColor: '#ffffff',
        color: '#1f2937',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
        padding: '12px',
        overflowY: 'auto',
      }}
    >
      <RightClickMenuTitle
        title={() => handleTitle(title || t('autofillDetails', 'Autofill details'))}
        handleClick={() => {
          // 1. Fill from standard profile data
          getAllInputFields(Object.fromEntries(items));
          // 2. Also fill any captured saved-site details for this current URL
          const currentUrl = window.location.href;
          const siteDataFromItems = (Object.fromEntries(items) as any)?.sites?.[currentUrl];
          if (siteDataFromItems) {
            setAllInputFields(siteDataFromItems);
          } else {
            browserStorage?.local?.get?.(['saved_sites', currentUrl])?.then?.((res: any) => {
              const saved = res?.saved_sites?.[currentUrl] || res?.[currentUrl];
              if (saved && typeof saved === 'object') {
                setAllInputFields(saved);
              }
            });
          }
        }}
      />
      <RightClickMenuItem
        title={() => handleTitle(t('tempEmail', 'Temp Email'))}
        handleClick={(ce) => handleClick(generateRandomEmail(), ce)}
      />
      <RightClickMenuItem
        title={() => handleTitle(t('tempPassword', 'Temp Password'))}
        handleClick={(ce) => handleClick(generateRandomPassword(), ce)}
      />
      {data.map((item) => {
        return Array.isArray(item[1]) ? (
          <Fragment key={item[0]}>
            <RightClickMenuItem
              title={() => handleTitle(item[0])}
              handleClick={() => {}}
            />
            {item[1].map((value) => (
              <RightClickMenuSubItem
                key={value}
                title={() => handleTitle(value)}
                handleClick={(ce: any) => handleClick(value, ce)}
                parent={String(item[0])}
              />
            ))}
          </Fragment>
        ) : typeof item[1] === 'object' ? (
          <Fragment key={item[0]}>
            <RightClickMenuItem
              title={() => handleTitle(item[0])}
              handleClick={() => {}}
            />
            {Object.entries(item[1] as object).map((value) => (
              <RightClickMenuSubItem
                title={() => handleTitle(value[0])}
                handleClick={(ce: any) => handleClick(value[1] as string, ce)}
                parent={String(item[0])}
              />
            ))}
          </Fragment>
        ) : (
          <Fragment key={item[0]}>
            <RightClickMenuItem
              title={() => handleTitle(item[0])}
              handleClick={(ce) => handleClick(item[1] as string, ce)}
            />
          </Fragment>
        );
      })}
    </div>
  );
};
